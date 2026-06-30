import { Hono } from "hono";
import { cors } from "hono/cors";
import { and, eq, gte, lte, desc, like, or, sql } from "drizzle-orm";
import { generateText, streamText } from "ai";
import dedent from "dedent";
import { auth } from "./auth";
import { authMiddleware, requireAuth } from "./middleware/auth";
import { db } from "./database";
import * as s from "./database/schema";
import { gateway, MODEL } from "./agent/gateway";
import { buildUserContext } from "./agent/context";
import { presignPut, presignGet } from "./lib/s3";
import { TZ_LENDERS, BOT_CENTRAL_RATE, AVG_COMMERCIAL_LENDING, recommendLenders, businessIdeas, buildPlan } from "./lib/money";

const VISION_MODEL = "google/gemini-3-flash";

type Variables = {
  user: { id: string; name: string; email: string } | null;
  session: unknown;
};

const uid = (c: { get: (k: "user") => Variables["user"] }) => c.get("user")!.id;

const app = new Hono<{ Variables: Variables }>()
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .basePath("api")
  .use("*", authMiddleware)
  .get("/health", (c) => c.json({ status: "ok" }, 200))

  // ---------------- TRANSACTIONS ----------------
  .get("/transactions", requireAuth, async (c) => {
    const rows = await db.select().from(s.transactions).where(eq(s.transactions.userId, uid(c))).orderBy(desc(s.transactions.date));
    return c.json({ transactions: rows }, 200);
  })
  .post("/transactions", requireAuth, async (c) => {
    const b = await c.req.json();
    const [row] = await db.insert(s.transactions).values({
      userId: uid(c),
      type: b.type,
      amount: Number(b.amount),
      category: b.category,
      note: b.note ?? null,
      receiptUrl: b.receiptUrl ?? null,
      source: b.source ?? "manual",
      date: b.date ? new Date(b.date) : new Date(),
    }).returning();
    return c.json({ transaction: row }, 201);
  })
  .put("/transactions/:id", requireAuth, async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json();
    const [row] = await db.update(s.transactions).set({
      type: b.type, amount: Number(b.amount), category: b.category, note: b.note ?? null,
      date: b.date ? new Date(b.date) : undefined,
    }).where(and(eq(s.transactions.id, id), eq(s.transactions.userId, uid(c)))).returning();
    return c.json({ transaction: row }, 200);
  })
  .delete("/transactions/:id", requireAuth, async (c) => {
    await db.delete(s.transactions).where(and(eq(s.transactions.id, Number(c.req.param("id"))), eq(s.transactions.userId, uid(c))));
    return c.json({ ok: true }, 200);
  })

  // ---------------- BUDGETS ----------------
  .get("/budgets", requireAuth, async (c) => {
    const rows = await db.select().from(s.budgets).where(eq(s.budgets.userId, uid(c)));
    return c.json({ budgets: rows }, 200);
  })
  .post("/budgets", requireAuth, async (c) => {
    const b = await c.req.json();
    const [row] = await db.insert(s.budgets).values({
      userId: uid(c), category: b.category, limit: Number(b.limit), period: b.period ?? "monthly",
    }).returning();
    return c.json({ budget: row }, 201);
  })
  .delete("/budgets/:id", requireAuth, async (c) => {
    await db.delete(s.budgets).where(and(eq(s.budgets.id, Number(c.req.param("id"))), eq(s.budgets.userId, uid(c))));
    return c.json({ ok: true }, 200);
  })

  // ---------------- FINANCE REPORT ----------------
  .get("/finance/report", requireAuth, async (c) => {
    const period = c.req.query("period") ?? "monthly"; // daily|monthly|yearly
    const now = new Date();
    let start: Date;
    if (period === "daily") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === "yearly") start = new Date(now.getFullYear(), 0, 1);
    else start = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await db.select().from(s.transactions)
      .where(and(eq(s.transactions.userId, uid(c)), gte(s.transactions.date, start)));

    const income = rows.filter((r) => r.type === "income").reduce((a, r) => a + r.amount, 0);
    const expense = rows.filter((r) => r.type === "expense").reduce((a, r) => a + r.amount, 0);
    const byCategory: Record<string, number> = {};
    for (const r of rows.filter((r) => r.type === "expense")) byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount;

    // daily series for last 30 days
    const series: { date: string; income: number; expense: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 864e5);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, income: 0, expense: 0 });
    }
    const seriesRows = await db.select().from(s.transactions)
      .where(and(eq(s.transactions.userId, uid(c)), gte(s.transactions.date, new Date(now.getTime() - 30 * 864e5))));
    for (const r of seriesRows) {
      const key = r.date.toISOString().slice(0, 10);
      const item = series.find((x) => x.date === key);
      if (item) item[r.type === "income" ? "income" : "expense"] += r.amount;
    }

    return c.json({ period, income, expense, net: income - expense, byCategory, series }, 200);
  })

  // ---------------- DIARY ----------------
  .get("/diary", requireAuth, async (c) => {
    const rows = await db.select().from(s.diaryEntries).where(eq(s.diaryEntries.userId, uid(c))).orderBy(desc(s.diaryEntries.date));
    return c.json({ entries: rows }, 200);
  })
  .post("/diary", requireAuth, async (c) => {
    const b = await c.req.json();
    const [row] = await db.insert(s.diaryEntries).values({
      userId: uid(c), title: b.title ?? null, content: b.content ?? "", mood: b.mood ?? null,
      tags: b.tags ?? null, mediaUrls: b.mediaUrls ?? null, date: b.date ? new Date(b.date) : new Date(),
    }).returning();
    return c.json({ entry: row }, 201);
  })
  .put("/diary/:id", requireAuth, async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json();
    const [row] = await db.update(s.diaryEntries).set({
      title: b.title ?? null, content: b.content ?? "", mood: b.mood ?? null, tags: b.tags ?? null,
      mediaUrls: b.mediaUrls ?? null, updatedAt: new Date(),
      date: b.date ? new Date(b.date) : undefined,
    }).where(and(eq(s.diaryEntries.id, id), eq(s.diaryEntries.userId, uid(c)))).returning();
    return c.json({ entry: row }, 200);
  })
  .delete("/diary/:id", requireAuth, async (c) => {
    await db.delete(s.diaryEntries).where(and(eq(s.diaryEntries.id, Number(c.req.param("id"))), eq(s.diaryEntries.userId, uid(c))));
    return c.json({ ok: true }, 200);
  })

  // ---------------- REMINDERS ----------------
  .get("/reminders", requireAuth, async (c) => {
    const rows = await db.select().from(s.reminders).where(eq(s.reminders.userId, uid(c))).orderBy(desc(s.reminders.createdAt));
    return c.json({ reminders: rows }, 200);
  })
  .post("/reminders", requireAuth, async (c) => {
    const b = await c.req.json();
    const [row] = await db.insert(s.reminders).values({
      userId: uid(c), title: b.title, notes: b.notes ?? null,
      dueAt: b.dueAt ? new Date(b.dueAt) : null, priority: b.priority ?? "medium",
      recurrence: b.recurrence ?? "none", locationName: b.locationName ?? null,
    }).returning();
    return c.json({ reminder: row }, 201);
  })
  .put("/reminders/:id", requireAuth, async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json();
    const [row] = await db.update(s.reminders).set({
      title: b.title, notes: b.notes ?? null, dueAt: b.dueAt ? new Date(b.dueAt) : null,
      priority: b.priority ?? "medium", recurrence: b.recurrence ?? "none",
      locationName: b.locationName ?? null, completed: b.completed ?? false,
    }).where(and(eq(s.reminders.id, id), eq(s.reminders.userId, uid(c)))).returning();
    return c.json({ reminder: row }, 200);
  })
  .post("/reminders/:id/toggle", requireAuth, async (c) => {
    const id = Number(c.req.param("id"));
    const [cur] = await db.select().from(s.reminders).where(and(eq(s.reminders.id, id), eq(s.reminders.userId, uid(c))));
    if (!cur) return c.json({ message: "not found" }, 404);
    const [row] = await db.update(s.reminders).set({ completed: !cur.completed }).where(eq(s.reminders.id, id)).returning();
    return c.json({ reminder: row }, 200);
  })
  .delete("/reminders/:id", requireAuth, async (c) => {
    await db.delete(s.reminders).where(and(eq(s.reminders.id, Number(c.req.param("id"))), eq(s.reminders.userId, uid(c))));
    return c.json({ ok: true }, 200);
  })

  // ---------------- ALARMS ----------------
  .get("/alarms", requireAuth, async (c) => {
    const rows = await db.select().from(s.alarms).where(eq(s.alarms.userId, uid(c))).orderBy(s.alarms.time);
    return c.json({ alarms: rows }, 200);
  })
  .post("/alarms", requireAuth, async (c) => {
    const b = await c.req.json();
    const [row] = await db.insert(s.alarms).values({
      userId: uid(c), label: b.label ?? "Alarm", time: b.time, days: b.days ?? "",
      tone: b.tone ?? "default", vibrate: b.vibrate ?? true, isBedtime: b.isBedtime ?? false,
    }).returning();
    return c.json({ alarm: row }, 201);
  })
  .put("/alarms/:id", requireAuth, async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json();
    const [row] = await db.update(s.alarms).set({
      label: b.label, time: b.time, days: b.days ?? "", enabled: b.enabled,
      tone: b.tone ?? "default", vibrate: b.vibrate ?? true, isBedtime: b.isBedtime ?? false,
    }).where(and(eq(s.alarms.id, id), eq(s.alarms.userId, uid(c)))).returning();
    return c.json({ alarm: row }, 200);
  })
  .post("/alarms/:id/toggle", requireAuth, async (c) => {
    const id = Number(c.req.param("id"));
    const [cur] = await db.select().from(s.alarms).where(and(eq(s.alarms.id, id), eq(s.alarms.userId, uid(c))));
    if (!cur) return c.json({ message: "not found" }, 404);
    const [row] = await db.update(s.alarms).set({ enabled: !cur.enabled }).where(eq(s.alarms.id, id)).returning();
    return c.json({ alarm: row }, 200);
  })
  .delete("/alarms/:id", requireAuth, async (c) => {
    await db.delete(s.alarms).where(and(eq(s.alarms.id, Number(c.req.param("id"))), eq(s.alarms.userId, uid(c))));
    return c.json({ ok: true }, 200);
  })

  // ---------------- GOALS ----------------
  .get("/goals", requireAuth, async (c) => {
    const rows = await db.select().from(s.goals).where(eq(s.goals.userId, uid(c))).orderBy(desc(s.goals.createdAt));
    return c.json({ goals: rows }, 200);
  })
  .post("/goals", requireAuth, async (c) => {
    const b = await c.req.json();
    const [row] = await db.insert(s.goals).values({
      userId: uid(c), title: b.title, description: b.description ?? null, category: b.category ?? "personal",
      horizon: b.horizon ?? "monthly", targetValue: Number(b.targetValue ?? 100), currentValue: Number(b.currentValue ?? 0),
      unit: b.unit ?? "%", deadline: b.deadline ? new Date(b.deadline) : null,
    }).returning();
    return c.json({ goal: row }, 201);
  })
  .put("/goals/:id", requireAuth, async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json();
    const completed = b.currentValue !== undefined && Number(b.currentValue) >= Number(b.targetValue ?? 100);
    const [row] = await db.update(s.goals).set({
      title: b.title, description: b.description ?? null, category: b.category ?? "personal",
      horizon: b.horizon ?? "monthly", targetValue: Number(b.targetValue ?? 100), currentValue: Number(b.currentValue ?? 0),
      unit: b.unit ?? "%", deadline: b.deadline ? new Date(b.deadline) : null,
      completed: b.completed ?? completed,
    }).where(and(eq(s.goals.id, id), eq(s.goals.userId, uid(c)))).returning();
    return c.json({ goal: row }, 200);
  })
  .delete("/goals/:id", requireAuth, async (c) => {
    await db.delete(s.goals).where(and(eq(s.goals.id, Number(c.req.param("id"))), eq(s.goals.userId, uid(c))));
    return c.json({ ok: true }, 200);
  })

  // ---------------- HABITS ----------------
  .get("/habits", requireAuth, async (c) => {
    const habits = await db.select().from(s.habits).where(eq(s.habits.userId, uid(c)));
    const logs = await db.select().from(s.habitLogs).where(eq(s.habitLogs.userId, uid(c)));
    return c.json({ habits, logs }, 200);
  })
  .post("/habits", requireAuth, async (c) => {
    const b = await c.req.json();
    const [row] = await db.insert(s.habits).values({
      userId: uid(c), name: b.name, icon: b.icon ?? "CheckCircle", color: b.color ?? "#6C5CE7",
      targetPerDay: Number(b.targetPerDay ?? 1), unit: b.unit ?? "times",
    }).returning();
    return c.json({ habit: row }, 201);
  })
  .delete("/habits/:id", requireAuth, async (c) => {
    await db.delete(s.habits).where(and(eq(s.habits.id, Number(c.req.param("id"))), eq(s.habits.userId, uid(c))));
    return c.json({ ok: true }, 200);
  })
  .post("/habits/:id/log", requireAuth, async (c) => {
    const habitId = Number(c.req.param("id"));
    const b = await c.req.json().catch(() => ({}));
    const date = b.date ?? new Date().toISOString().slice(0, 10);
    const delta = Number(b.delta ?? 1);
    const [existing] = await db.select().from(s.habitLogs)
      .where(and(eq(s.habitLogs.habitId, habitId), eq(s.habitLogs.userId, uid(c)), eq(s.habitLogs.date, date)));
    let row;
    if (existing) {
      const newCount = Math.max(0, existing.count + delta);
      if (newCount === 0) {
        await db.delete(s.habitLogs).where(eq(s.habitLogs.id, existing.id));
        return c.json({ removed: true, date }, 200);
      }
      [row] = await db.update(s.habitLogs).set({ count: newCount }).where(eq(s.habitLogs.id, existing.id)).returning();
    } else if (delta > 0) {
      [row] = await db.insert(s.habitLogs).values({ userId: uid(c), habitId, date, count: delta }).returning();
    }
    return c.json({ log: row ?? null }, 200);
  })

  // ---------------- TIMETABLE ----------------
  .get("/timetable", requireAuth, async (c) => {
    const rows = await db.select().from(s.timetable).where(eq(s.timetable.userId, uid(c)));
    return c.json({ timetable: rows }, 200);
  })
  .post("/timetable", requireAuth, async (c) => {
    const b = await c.req.json();
    const [row] = await db.insert(s.timetable).values({
      userId: uid(c), title: b.title, dayOfWeek: Number(b.dayOfWeek), startTime: b.startTime,
      endTime: b.endTime, color: b.color ?? "#6C5CE7", location: b.location ?? null,
    }).returning();
    return c.json({ entry: row }, 201);
  })
  .delete("/timetable/:id", requireAuth, async (c) => {
    await db.delete(s.timetable).where(and(eq(s.timetable.id, Number(c.req.param("id"))), eq(s.timetable.userId, uid(c))));
    return c.json({ ok: true }, 200);
  })

  // ---------------- NOTES ----------------
  .get("/notes", requireAuth, async (c) => {
    const rows = await db.select().from(s.notes).where(eq(s.notes.userId, uid(c))).orderBy(desc(s.notes.updatedAt));
    return c.json({ notes: rows }, 200);
  })
  .post("/notes", requireAuth, async (c) => {
    const b = await c.req.json();
    const [row] = await db.insert(s.notes).values({
      userId: uid(c), title: b.title ?? "Untitled", content: b.content ?? "",
      folder: b.folder ?? "General", tags: b.tags ?? null,
    }).returning();
    return c.json({ note: row }, 201);
  })
  .put("/notes/:id", requireAuth, async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json();
    const [row] = await db.update(s.notes).set({
      title: b.title ?? "Untitled", content: b.content ?? "", folder: b.folder ?? "General",
      tags: b.tags ?? null, favorite: b.favorite, updatedAt: new Date(),
    }).where(and(eq(s.notes.id, id), eq(s.notes.userId, uid(c)))).returning();
    return c.json({ note: row }, 200);
  })
  .post("/notes/:id/favorite", requireAuth, async (c) => {
    const id = Number(c.req.param("id"));
    const [cur] = await db.select().from(s.notes).where(and(eq(s.notes.id, id), eq(s.notes.userId, uid(c))));
    if (!cur) return c.json({ message: "not found" }, 404);
    const [row] = await db.update(s.notes).set({ favorite: !cur.favorite }).where(eq(s.notes.id, id)).returning();
    return c.json({ note: row }, 200);
  })
  .delete("/notes/:id", requireAuth, async (c) => {
    await db.delete(s.notes).where(and(eq(s.notes.id, Number(c.req.param("id"))), eq(s.notes.userId, uid(c))));
    return c.json({ ok: true }, 200);
  })

  // ---------------- LOCATIONS ----------------
  .get("/locations", requireAuth, async (c) => {
    const rows = await db.select().from(s.locations).where(eq(s.locations.userId, uid(c))).orderBy(desc(s.locations.recordedAt));
    return c.json({ locations: rows }, 200);
  })
  .post("/locations", requireAuth, async (c) => {
    const b = await c.req.json();
    const [row] = await db.insert(s.locations).values({
      userId: uid(c), latitude: Number(b.latitude), longitude: Number(b.longitude),
      address: b.address ?? null, placeName: b.placeName ?? null, note: b.note ?? null,
      recordedAt: b.recordedAt ? new Date(b.recordedAt) : new Date(),
    }).returning();
    return c.json({ location: row }, 201);
  })
  .post("/locations/:id/favorite", requireAuth, async (c) => {
    const id = Number(c.req.param("id"));
    const [cur] = await db.select().from(s.locations).where(and(eq(s.locations.id, id), eq(s.locations.userId, uid(c))));
    if (!cur) return c.json({ message: "not found" }, 404);
    const [row] = await db.update(s.locations).set({ isFavorite: !cur.isFavorite }).where(eq(s.locations.id, id)).returning();
    return c.json({ location: row }, 200);
  })
  .delete("/locations/:id", requireAuth, async (c) => {
    await db.delete(s.locations).where(and(eq(s.locations.id, Number(c.req.param("id"))), eq(s.locations.userId, uid(c))));
    return c.json({ ok: true }, 200);
  })
  .delete("/locations", requireAuth, async (c) => {
    await db.delete(s.locations).where(eq(s.locations.userId, uid(c)));
    return c.json({ ok: true }, 200);
  })

  // ---------------- SETTINGS ----------------
  .get("/settings", requireAuth, async (c) => {
    let [row] = await db.select().from(s.settings).where(eq(s.settings.userId, uid(c)));
    if (!row) [row] = await db.insert(s.settings).values({ userId: uid(c) }).returning();
    return c.json({ settings: row }, 200);
  })
  .put("/settings", requireAuth, async (c) => {
    const b = await c.req.json();
    const existing = await db.select().from(s.settings).where(eq(s.settings.userId, uid(c)));
    if (!existing.length) await db.insert(s.settings).values({ userId: uid(c) });
    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of ["theme", "currency", "pinEnabled", "pinHash", "biometricEnabled", "locationTrackingEnabled", "profileImage", "country", "monthlyIncome", "expenseTargetPct", "savingsTargetPct", "investTargetPct"] as const) {
      if (b[k] !== undefined) set[k] = b[k];
    }
    const [row] = await db.update(s.settings).set(set).where(eq(s.settings.userId, uid(c))).returning();
    return c.json({ settings: row }, 200);
  })

  // ---------------- DASHBOARD (aggregate) ----------------
  .get("/dashboard", requireAuth, async (c) => {
    const u = uid(c);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStr = now.toISOString().slice(0, 10);
    const todayDow = now.getDay();

    const [txns, rems, gls, habits, hlogs, tt] = await Promise.all([
      db.select().from(s.transactions).where(and(eq(s.transactions.userId, u), gte(s.transactions.date, startOfMonth))),
      db.select().from(s.reminders).where(eq(s.reminders.userId, u)),
      db.select().from(s.goals).where(eq(s.goals.userId, u)),
      db.select().from(s.habits).where(eq(s.habits.userId, u)),
      db.select().from(s.habitLogs).where(and(eq(s.habitLogs.userId, u), eq(s.habitLogs.date, todayStr))),
      db.select().from(s.timetable).where(and(eq(s.timetable.userId, u), eq(s.timetable.dayOfWeek, todayDow))),
    ]);

    const spent = txns.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const earned = txns.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const overdueCount = rems.filter((r) => !r.completed && r.dueAt && r.dueAt < now).length;
    const todayRem = rems.filter((r) => !r.completed).slice(0, 5);
    const activeGoals = gls.filter((g) => !g.completed);
    const habitsDone = habits.filter((h) => {
      const count = hlogs.filter((l) => l.habitId === h.id).reduce((a, l) => a + l.count, 0);
      return count >= h.targetPerDay;
    }).length;

    // daily progress: blend of completed reminders today, habits, goals momentum
    const remDone = rems.filter((r) => r.completed).length;
    const progress = Math.min(100, Math.round(
      ((habits.length ? habitsDone / habits.length : 0) * 0.5 +
        (todayRem.length ? 0 : 0.2) +
        (activeGoals.length ? activeGoals.reduce((a, g) => a + g.currentValue / g.targetValue, 0) / activeGoals.length * 0.3 : 0)) * 100
    ));

    return c.json({
      finances: { spent, earned, net: earned - spent },
      reminders: { items: todayRem, overdueCount },
      goals: activeGoals.slice(0, 4),
      habits: { total: habits.length, done: habitsDone },
      schedule: tt.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      progress,
      remDone,
    }, 200);
  })

  // ---------------- GLOBAL SEARCH ----------------
  .get("/search", requireAuth, async (c) => {
    const q = (c.req.query("q") ?? "").trim();
    const u = uid(c);
    if (!q) return c.json({ results: [] }, 200);
    const term = `%${q}%`;
    const [txns, diary, notes, gls, rems, locs] = await Promise.all([
      db.select().from(s.transactions).where(and(eq(s.transactions.userId, u), or(like(s.transactions.category, term), like(s.transactions.note, term)))).limit(10),
      db.select().from(s.diaryEntries).where(and(eq(s.diaryEntries.userId, u), or(like(s.diaryEntries.title, term), like(s.diaryEntries.content, term), like(s.diaryEntries.tags, term)))).limit(10),
      db.select().from(s.notes).where(and(eq(s.notes.userId, u), or(like(s.notes.title, term), like(s.notes.content, term)))).limit(10),
      db.select().from(s.goals).where(and(eq(s.goals.userId, u), like(s.goals.title, term))).limit(10),
      db.select().from(s.reminders).where(and(eq(s.reminders.userId, u), like(s.reminders.title, term))).limit(10),
      db.select().from(s.locations).where(and(eq(s.locations.userId, u), or(like(s.locations.placeName, term), like(s.locations.address, term)))).limit(10),
    ]);
    const results = [
      ...txns.map((t) => ({ type: "transaction", id: t.id, title: `${t.category} • ${t.amount}`, sub: t.note ?? "", route: "/(tabs)/money" })),
      ...diary.map((d) => ({ type: "diary", id: d.id, title: d.title ?? "Diary entry", sub: (d.content ?? "").slice(0, 60), route: "/(tabs)/life" })),
      ...notes.map((n) => ({ type: "note", id: n.id, title: n.title, sub: (n.content ?? "").slice(0, 60), route: "/notes" })),
      ...gls.map((g) => ({ type: "goal", id: g.id, title: g.title, sub: `${Math.round((g.currentValue / g.targetValue) * 100)}%`, route: "/goals" })),
      ...rems.map((r) => ({ type: "reminder", id: r.id, title: r.title, sub: r.notes ?? "", route: "/(tabs)/plan" })),
      ...locs.map((l) => ({ type: "location", id: l.id, title: l.placeName ?? l.address ?? "Location", sub: "", route: "/timeline" })),
    ];
    return c.json({ results }, 200);
  })

  // ---------------- REPORTS (auto-generated summary) ----------------
  .get("/reports", requireAuth, async (c) => {
    const u = uid(c);
    const range = c.req.query("range") ?? "weekly"; // daily|weekly|monthly|yearly
    const now = new Date();
    let start: Date;
    if (range === "daily") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (range === "monthly") start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (range === "yearly") start = new Date(now.getFullYear(), 0, 1);
    else start = new Date(now.getTime() - 7 * 864e5);

    const [txns, rems, gls, habits, hlogs, locs] = await Promise.all([
      db.select().from(s.transactions).where(and(eq(s.transactions.userId, u), gte(s.transactions.date, start))),
      db.select().from(s.reminders).where(eq(s.reminders.userId, u)),
      db.select().from(s.goals).where(eq(s.goals.userId, u)),
      db.select().from(s.habits).where(eq(s.habits.userId, u)),
      db.select().from(s.habitLogs).where(and(eq(s.habitLogs.userId, u), gte(s.habitLogs.createdAt, start))),
      db.select().from(s.locations).where(and(eq(s.locations.userId, u), gte(s.locations.recordedAt, start))),
    ]);

    const income = txns.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const expense = txns.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const tasksDone = rems.filter((r) => r.completed && r.createdAt >= start).length;
    const goalsCompleted = gls.filter((g) => g.completed).length;
    const habitCheckins = hlogs.reduce((a, l) => a + l.count, 0);

    // travel distance estimate (haversine sum)
    let distanceKm = 0;
    const sortedLocs = [...locs].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
    for (let i = 1; i < sortedLocs.length; i++) {
      const a = sortedLocs[i - 1], b = sortedLocs[i];
      const R = 6371, dLat = (b.latitude - a.latitude) * Math.PI / 180, dLon = (b.longitude - a.longitude) * Math.PI / 180;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      distanceKm += R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }

    return c.json({
      range,
      finance: { income, expense, savings: income - expense },
      productivity: { tasksDone, goalsCompleted, habitCheckins, activeHabits: habits.length },
      travel: { points: locs.length, distanceKm: Math.round(distanceKm * 10) / 10 },
    }, 200);
  })

  // ---------------- AI ASSISTANT ----------------
  .get("/ai/history", requireAuth, async (c) => {
    const rows = await db.select().from(s.aiMessages).where(eq(s.aiMessages.userId, uid(c))).orderBy(s.aiMessages.createdAt).limit(100);
    return c.json({ messages: rows }, 200);
  })
  .post("/ai/chat", requireAuth, async (c) => {
    const u = uid(c);
    const { message } = await c.req.json();
    const userName = c.get("user")!.name;
    const ctx = await buildUserContext(u);
    await db.insert(s.aiMessages).values({ userId: u, role: "user", content: message });

    const recent = await db.select().from(s.aiMessages).where(eq(s.aiMessages.userId, u)).orderBy(desc(s.aiMessages.createdAt)).limit(10);
    const historyText = recent.reverse().map((m) => `${m.role}: ${m.content}`).join("\n");

    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: dedent`
        You are LifePilot, ${userName}'s personal life assistant. You have full access to their life data below.
        Be concise, warm, and actionable. Use real numbers from the data. When asked "what should I do now",
        prioritize overdue tasks, today's schedule, and unfinished habits. Format with short bullets when helpful.

        === USER DATA SNAPSHOT ===
        ${ctx}

        === RECENT CONVERSATION ===
        ${historyText}

        Answer the user's latest message: "${message}"
      `,
    });

    const [saved] = await db.insert(s.aiMessages).values({ userId: u, role: "assistant", content: text }).returning();
    return c.json({ reply: text, message: saved }, 200);
  })
  .post("/ai/insight", requireAuth, async (c) => {
    const u = uid(c);
    const ctx = await buildUserContext(u);
    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: dedent`
        Based on this user's life data, write ONE short, specific, motivating insight or suggestion
        (max 2 sentences, no preamble). Use a real number when possible.

        ${ctx}
      `,
    });
    return c.json({ insight: text.trim() }, 200);
  })
  .post("/ai/analyze-spending", requireAuth, async (c) => {
    const u = uid(c);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const txns = await db.select().from(s.transactions).where(and(eq(s.transactions.userId, u), gte(s.transactions.date, start)));
    const byCat: Record<string, number> = {};
    for (const t of txns.filter((t) => t.type === "expense")) byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: dedent`
        Analyze this month's spending by category and give 3 concise, practical tips to save money.
        Spending: ${JSON.stringify(byCat)}.
        Total: ${Object.values(byCat).reduce((a, b) => a + b, 0).toFixed(2)}.
        Use bullets. Be specific and reference the actual categories.
      `,
    });
    return c.json({ analysis: text.trim(), byCategory: byCat }, 200);
  })
  .post("/ai/clear", requireAuth, async (c) => {
    await db.delete(s.aiMessages).where(eq(s.aiMessages.userId, uid(c)));
    return c.json({ ok: true }, 200);
  })

  // ---------------- FILE UPLOAD (Tigris presigned) ----------------
  .post("/upload/presign", requireAuth, async (c) => {
    const { filename, contentType } = await c.req.json();
    const safe = String(filename ?? "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `uploads/${uid(c)}/${Date.now()}-${safe}`;
    const url = await presignPut(key, contentType ?? "application/octet-stream");
    return c.json({ url, key }, 200);
  })
  // Return a temporary viewable URL for a stored key
  .post("/upload/view", requireAuth, async (c) => {
    const { key } = await c.req.json();
    if (!key) return c.json({ error: "key required" }, 400);
    const url = await presignGet(String(key));
    return c.json({ url }, 200);
  })

  // ---------------- AI: READ RECEIPT (vision OCR) ----------------
  .post("/ai/read-receipt", requireAuth, async (c) => {
    const { key, imageUrl } = await c.req.json();
    let url = imageUrl as string | undefined;
    if (!url && key) url = await presignGet(String(key));
    if (!url) return c.json({ error: "key or imageUrl required" }, 400);

    const [st] = await db.select().from(s.settings).where(eq(s.settings.userId, uid(c)));
    const currency = st?.currency ?? "TZS";

    let amount = 0;
    let suggestedType: "expense" | "income" = "expense";
    let merchant = "";
    let rawText = "";
    try {
      const { text } = await generateText({
        model: gateway(VISION_MODEL),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: dedent`
                  Read this receipt/document/photo. Extract the single most important MONEY AMOUNT (the grand total if a receipt).
                  The user's currency is ${currency}. Return STRICT JSON only, no markdown:
                  {"amount": <number, no thousands separators, dot decimal>, "merchant": "<name or empty>", "type": "expense"|"income", "summary": "<short>"}
                  If you cannot find an amount, set amount to 0.
                `,
              },
              { type: "image", image: new URL(url) },
            ],
          },
        ],
      });
      rawText = text;
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        amount = Number(parsed.amount) || 0;
        merchant = String(parsed.merchant ?? "");
        if (parsed.type === "income") suggestedType = "income";
      }
    } catch (e) {
      return c.json({ error: "Could not read the document. Enter the amount manually.", amount: 0 }, 200);
    }
    return c.json({ amount, merchant, suggestedType, currency, raw: rawText.slice(0, 400) }, 200);
  })

  // ---------------- MONEY: 70/20/10 PLAN ----------------
  .get("/money/plan", requireAuth, async (c) => {
    const u = uid(c);
    let [st] = await db.select().from(s.settings).where(eq(s.settings.userId, u));
    if (!st) [st] = await db.insert(s.settings).values({ userId: u }).returning();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const txns = await db.select().from(s.transactions).where(and(eq(s.transactions.userId, u), gte(s.transactions.date, start)));

    const spent = txns.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const earned = txns.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    // savings/investment derived from transactions tagged with category keywords
    const saved = txns.filter((t) => t.type === "expense" && /sav/i.test(t.category)).reduce((a, t) => a + t.amount, 0);
    const invested = txns.filter((t) => t.type === "expense" && /invest/i.test(t.category)).reduce((a, t) => a + t.amount, 0);

    // monthly income: explicit setting OR this month's earned income
    const income = (st.monthlyIncome ?? 0) > 0 ? st.monthlyIncome : earned;
    const plan = buildPlan(income, spent - saved - invested, saved, invested, {
      expense: st.expenseTargetPct ?? 70,
      savings: st.savingsTargetPct ?? 20,
      invest: st.investTargetPct ?? 10,
    });
    return c.json({ plan: { ...plan, currency: st.currency ?? "TZS", earnedThisMonth: earned, spentThisMonth: spent, expensesOverIncome: spent > earned && earned > 0 } }, 200);
  })

  // ---------------- MONEY: DAILY ADVICE (business + TZ loans) ----------------
  .get("/money/advice", requireAuth, async (c) => {
    const u = uid(c);
    let [st] = await db.select().from(s.settings).where(eq(s.settings.userId, u));
    if (!st) [st] = await db.insert(s.settings).values({ userId: u }).returning();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const txns = await db.select().from(s.transactions).where(and(eq(s.transactions.userId, u), gte(s.transactions.date, start)));
    const spent = txns.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const earned = txns.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const income = (st.monthlyIncome ?? 0) > 0 ? st.monthlyIncome : earned;
    const currency = st.currency ?? "TZS";

    const lenders = recommendLenders(income);
    const ideas = businessIdeas(income);

    let advice = "";
    try {
      const { text } = await generateText({
        model: gateway(MODEL),
        prompt: dedent`
          You are LifePilot, a Tanzanian personal finance coach. Give ONE short daily money tip (2-3 sentences, no preamble, no markdown headers).
          Currency: ${currency}. Monthly income: ${income}. Spent this month: ${spent}. Earned this month: ${earned}.
          Use the 70/20/10 rule (70% needs/wants, 20% savings, 10% investment). Reference a real number.
          ${spent > earned && earned > 0 ? "WARNING: they are spending more than they earn — tell them firmly but kindly." : ""}
        `,
      });
      advice = text.trim();
    } catch {
      advice = "Aim to keep needs & wants under 70% of income, save 20%, and invest 10%. Small consistent habits build wealth.";
    }

    return c.json({
      advice,
      currency,
      income,
      rule: { expense: st.expenseTargetPct ?? 70, savings: st.savingsTargetPct ?? 20, invest: st.investTargetPct ?? 10 },
      businessIdeas: ideas,
      lending: { ...lenders, botRate: BOT_CENTRAL_RATE, avgCommercial: AVG_COMMERCIAL_LENDING },
      allLenders: TZ_LENDERS,
    }, 200);
  });

export type AppType = typeof app;
export default app;

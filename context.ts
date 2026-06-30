import { db } from "../database";
import * as s from "../database/schema";
import { and, eq, gte, desc } from "drizzle-orm";

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Build a compact, structured snapshot of the user's life data so the AI
 * assistant can answer questions like "what should I do now?", "what did I
 * spend this month?", "where was I yesterday?", "which tasks are overdue?".
 */
export async function buildUserContext(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const last30 = new Date(now.getTime() - 30 * 864e5);
  const yesterday = new Date(now.getTime() - 864e5);

  const [txns, rems, gls, hbs, hlogs, locs, tt, nts] = await Promise.all([
    db.select().from(s.transactions).where(and(eq(s.transactions.userId, userId), gte(s.transactions.date, last30))).orderBy(desc(s.transactions.date)),
    db.select().from(s.reminders).where(eq(s.reminders.userId, userId)),
    db.select().from(s.goals).where(eq(s.goals.userId, userId)),
    db.select().from(s.habits).where(eq(s.habits.userId, userId)),
    db.select().from(s.habitLogs).where(eq(s.habitLogs.userId, userId)),
    db.select().from(s.locations).where(eq(s.locations.userId, userId)).orderBy(desc(s.locations.recordedAt)).limit(50),
    db.select().from(s.timetable).where(eq(s.timetable.userId, userId)),
    db.select().from(s.notes).where(eq(s.notes.userId, userId)).orderBy(desc(s.notes.updatedAt)).limit(10),
  ]);

  // Finances
  const monthTx = txns.filter((t) => t.date >= startOfMonth);
  const spentThisMonth = monthTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const earnedThisMonth = monthTx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const byCat: Record<string, number> = {};
  for (const t of monthTx.filter((t) => t.type === "expense")) byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Reminders
  const overdue = rems.filter((r) => !r.completed && r.dueAt && r.dueAt < now);
  const upcoming = rems.filter((r) => !r.completed && r.dueAt && r.dueAt >= now).sort((a, b) => (a.dueAt!.getTime() - b.dueAt!.getTime())).slice(0, 8);

  // Today's timetable
  const todayDow = now.getDay();
  const todayClasses = tt.filter((x) => x.dayOfWeek === todayDow).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Habits today
  const todayStr = fmtDate(now);
  const habitStatus = hbs.map((h) => {
    const c = hlogs.filter((l) => l.habitId === h.id && l.date === todayStr).reduce((a, l) => a + l.count, 0);
    return `${h.name}: ${c}/${h.targetPerDay}`;
  });

  // Locations yesterday
  const yStr = fmtDate(yesterday);
  const yLocs = locs.filter((l) => fmtDate(l.recordedAt) === yStr);

  const lines: string[] = [];
  lines.push(`Current date/time: ${now.toString()}`);
  lines.push(`Today is ${now.toLocaleDateString("en-US", { weekday: "long" })}.`);
  lines.push("");
  lines.push(`## FINANCES (this month)`);
  lines.push(`Spent: ${spentThisMonth.toFixed(2)} | Earned: ${earnedThisMonth.toFixed(2)} | Net: ${(earnedThisMonth - spentThisMonth).toFixed(2)}`);
  if (topCats.length) lines.push(`Top spend categories: ${topCats.map(([c, v]) => `${c} ${v.toFixed(0)}`).join(", ")}`);
  lines.push("");
  lines.push(`## REMINDERS / TASKS`);
  lines.push(`Overdue (${overdue.length}): ${overdue.map((r) => r.title).join("; ") || "none"}`);
  lines.push(`Upcoming: ${upcoming.map((r) => `${r.title} @ ${r.dueAt?.toLocaleString()}`).join("; ") || "none"}`);
  lines.push("");
  lines.push(`## TODAY'S SCHEDULE`);
  lines.push(todayClasses.map((x) => `${x.startTime}-${x.endTime} ${x.title}`).join("; ") || "nothing scheduled");
  lines.push("");
  lines.push(`## HABITS TODAY`);
  lines.push(habitStatus.join("; ") || "no habits tracked");
  lines.push("");
  lines.push(`## GOALS`);
  lines.push(gls.filter((g) => !g.completed).map((g) => `${g.title} (${g.horizon}): ${Math.round((g.currentValue / g.targetValue) * 100)}%`).join("; ") || "no active goals");
  lines.push("");
  lines.push(`## LOCATIONS YESTERDAY`);
  lines.push(yLocs.map((l) => l.placeName || l.address || `${l.latitude.toFixed(3)},${l.longitude.toFixed(3)}`).join(" -> ") || "no location data");
  lines.push("");
  lines.push(`## RECENT NOTES`);
  lines.push(nts.map((n) => n.title).join("; ") || "none");

  return lines.join("\n");
}

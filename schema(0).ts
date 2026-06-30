import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

const ownerId = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

const ts = (name: string) =>
  integer(name, { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date());

// ---------- FINANCES ----------
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  type: text("type").notNull(), // 'income' | 'expense'
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  note: text("note"),
  receiptUrl: text("receipt_url"), // presigned/stored key of uploaded receipt/document
  source: text("source").default("manual"), // manual | receipt
  date: integer("date", { mode: "timestamp" }).notNull(),
  createdAt: ts("created_at"),
});

export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  category: text("category").notNull(),
  limit: real("limit").notNull(),
  period: text("period").notNull().default("monthly"), // monthly | weekly | yearly
  createdAt: ts("created_at"),
});

// ---------- DIARY ----------
export const diaryEntries = sqliteTable("diary_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  title: text("title"),
  content: text("content").notNull().default(""),
  mood: text("mood"), // happy, sad, neutral, excited, anxious, calm, angry, grateful
  tags: text("tags"), // comma-separated
  mediaUrls: text("media_urls"), // JSON array of urls
  date: integer("date", { mode: "timestamp" }).notNull(),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

// ---------- REMINDERS ----------
export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  title: text("title").notNull(),
  notes: text("notes"),
  dueAt: integer("due_at", { mode: "timestamp" }),
  priority: text("priority").notNull().default("medium"), // low | medium | high
  recurrence: text("recurrence").default("none"), // none | daily | weekly | monthly
  locationName: text("location_name"),
  completed: integer("completed", { mode: "boolean" }).notNull().$defaultFn(() => false),
  createdAt: ts("created_at"),
});

// ---------- ALARMS ----------
export const alarms = sqliteTable("alarms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  label: text("label").notNull().default("Alarm"),
  time: text("time").notNull(), // "07:30"
  days: text("days").notNull().default(""), // comma list 0-6 (Sun-Sat), empty = once
  enabled: integer("enabled", { mode: "boolean" }).notNull().$defaultFn(() => true),
  tone: text("tone").default("default"),
  vibrate: integer("vibrate", { mode: "boolean" }).notNull().$defaultFn(() => true),
  isBedtime: integer("is_bedtime", { mode: "boolean" }).notNull().$defaultFn(() => false),
  createdAt: ts("created_at"),
});

// ---------- GOALS ----------
export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").default("personal"),
  horizon: text("horizon").notNull().default("monthly"), // daily | weekly | monthly | yearly | 5year
  targetValue: real("target_value").notNull().default(100),
  currentValue: real("current_value").notNull().default(0),
  unit: text("unit").default("%"),
  deadline: integer("deadline", { mode: "timestamp" }),
  completed: integer("completed", { mode: "boolean" }).notNull().$defaultFn(() => false),
  createdAt: ts("created_at"),
});

// ---------- HABITS ----------
export const habits = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  name: text("name").notNull(),
  icon: text("icon").default("CheckCircle"),
  color: text("color").default("#6C5CE7"),
  targetPerDay: integer("target_per_day").notNull().default(1),
  unit: text("unit").default("times"),
  createdAt: ts("created_at"),
});

export const habitLogs = sqliteTable("habit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  habitId: integer("habit_id")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  count: integer("count").notNull().default(1),
  createdAt: ts("created_at"),
});

// ---------- TIMETABLE (weekly recurring) ----------
export const timetable = sqliteTable("timetable", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  title: text("title").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(), // "10:30"
  color: text("color").default("#6C5CE7"),
  location: text("location"),
  createdAt: ts("created_at"),
});

// ---------- NOTES ----------
export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  title: text("title").notNull().default("Untitled"),
  content: text("content").notNull().default(""),
  folder: text("folder").default("General"),
  tags: text("tags"),
  favorite: integer("favorite", { mode: "boolean" }).notNull().$defaultFn(() => false),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

// ---------- LOCATIONS / TIMELINE ----------
export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address"),
  placeName: text("place_name"),
  isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().$defaultFn(() => false),
  note: text("note"),
  recordedAt: integer("recorded_at", { mode: "timestamp" }).notNull(),
  createdAt: ts("created_at"),
});

// ---------- AI CHAT ----------
export const aiMessages = sqliteTable("ai_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: ts("created_at"),
});

// ---------- USER SETTINGS ----------
export const settings = sqliteTable("settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("dark"), // dark | light | system
  currency: text("currency").notNull().default("TZS"),
  profileImage: text("profile_image"), // stored key of profile picture in Tigris
  country: text("country").notNull().default("TZ"),
  monthlyIncome: real("monthly_income").notNull().default(0), // used for advice + 70/20/10 plan
  expenseTargetPct: real("expense_target_pct").notNull().default(70),
  savingsTargetPct: real("savings_target_pct").notNull().default(20),
  investTargetPct: real("invest_target_pct").notNull().default(10),
  pinEnabled: integer("pin_enabled", { mode: "boolean" }).notNull().$defaultFn(() => false),
  pinHash: text("pin_hash"),
  biometricEnabled: integer("biometric_enabled", { mode: "boolean" }).notNull().$defaultFn(() => false),
  locationTrackingEnabled: integer("location_tracking_enabled", { mode: "boolean" }).notNull().$defaultFn(() => false),
  updatedAt: ts("updated_at"),
});

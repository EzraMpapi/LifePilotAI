import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { storage } from "./storage";

/**
 * On-device alarm & reminder scheduling.
 *
 * All notifications here are scheduled LOCALLY on the device via the OS
 * scheduler. Once set they fire at the exact time even when the phone is
 * OFFLINE, the app is closed, or the screen is locked — exactly like a
 * native alarm clock. No server / network round-trip is involved at fire time.
 */

export const ALARM_CHANNEL = "lifepilot-alarms";
export const REMINDER_CHANNEL = "lifepilot-reminders";

// Map of our entity -> scheduled OS notification ids, persisted so we can
// cancel/reschedule across app restarts.
const MAP_KEY = "lp_notif_map_v1";

type NotifMap = Record<string, string[]>; // key: "alarm:12" | "reminder:5"

async function loadMap(): Promise<NotifMap> {
  try {
    const raw = await storage.getItem(MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
async function saveMap(m: NotifMap) {
  await storage.setItem(MAP_KEY, JSON.stringify(m));
}

// ---------------------------------------------------------------------------
// Setup: handler + Android channels (must run before scheduling)
// ---------------------------------------------------------------------------
let configured = false;

export async function configureNotifications(): Promise<boolean> {
  if (configured) return true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === "android") {
      // Alarm channel: max importance, sound + strong vibration, bypasses DND where allowed.
      await Notifications.setNotificationChannelAsync(ALARM_CHANNEL, {
        name: "Alarms",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 400, 250, 400, 250, 400],
        enableVibrate: true,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        lightColor: "#6C5CE7",
      });
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
        name: "Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        lightColor: "#6C5CE7",
      });
    }
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export async function ensurePermissions(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: true, allowCriticalAlerts: true },
      });
      status = req.status;
    }
    return status === "granted";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
async function cancelKey(key: string) {
  const map = await loadMap();
  const ids = map[key] ?? [];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  delete map[key];
  await saveMap(map);
}

async function storeKey(key: string, ids: string[]) {
  const map = await loadMap();
  map[key] = ids;
  await saveMap(map);
}

// ---------------------------------------------------------------------------
// ALARMS — repeat days come as comma-joined weekday indices (0=Sun..6=Sat).
// Empty days = fire once at the next occurrence of the time.
// ---------------------------------------------------------------------------
export async function scheduleAlarm(alarm: {
  id: number; label?: string; time: string; days?: string | null; enabled?: boolean;
}): Promise<void> {
  const key = `alarm:${alarm.id}`;
  await cancelKey(key);
  if (alarm.enabled === false) return;
  if (!(await configureNotifications())) return;
  if (!(await ensurePermissions())) return;

  const [h, m] = (alarm.time || "07:00").split(":").map((n) => parseInt(n, 10));
  const hour = isNaN(h) ? 7 : h;
  const minute = isNaN(m) ? 0 : m;
  const title = alarm.label?.trim() || "Alarm";
  const ids: string[] = [];

  const content = {
    title: `⏰ ${title}`,
    body: "Tap to open LifePilot AI",
    sound: "default" as const,
    ...(Platform.OS === "android" ? { channelId: ALARM_CHANNEL } : {}),
  };

  const days = (alarm.days || "").split(",").map((s) => s.trim()).filter(Boolean).map(Number);

  try {
    if (days.length === 0) {
      // One-shot at next occurrence.
      const now = new Date();
      const fire = new Date();
      fire.setHours(hour, minute, 0, 0);
      if (fire <= now) fire.setDate(fire.getDate() + 1);
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fire,
          channelId: Platform.OS === "android" ? ALARM_CHANNEL : undefined,
        },
      });
      ids.push(id);
    } else {
      // Weekly repeat per selected day. expo weekday: 1=Sun..7=Sat.
      for (const d of days) {
        const weekday = ((d % 7) + 1); // our 0=Sun -> expo 1=Sun
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
            channelId: Platform.OS === "android" ? ALARM_CHANNEL : undefined,
          },
        });
        ids.push(id);
      }
    }
    await storeKey(key, ids);
  } catch {
    // scheduling failed (e.g. permissions revoked) — leave unscheduled
  }
}

export async function cancelAlarm(id: number): Promise<void> {
  await cancelKey(`alarm:${id}`);
}

// ---------------------------------------------------------------------------
// REMINDERS — dueAt ISO string. recurrence none/daily/weekly/monthly.
// ---------------------------------------------------------------------------
export async function scheduleReminder(rem: {
  id: number; title: string; dueAt?: string | null; recurrence?: string | null; completed?: boolean;
}): Promise<void> {
  const key = `reminder:${rem.id}`;
  await cancelKey(key);
  if (rem.completed) return;
  if (!rem.dueAt) return;
  if (!(await configureNotifications())) return;
  if (!(await ensurePermissions())) return;

  const due = new Date(rem.dueAt);
  if (isNaN(due.getTime())) return;

  const content = {
    title: `🔔 ${rem.title}`,
    body: "Reminder from LifePilot AI",
    sound: "default" as const,
    ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL } : {}),
  };
  const rec = rem.recurrence || "none";
  const ids: string[] = [];

  try {
    if (rec === "daily") {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: due.getHours(),
          minute: due.getMinutes(),
          channelId: Platform.OS === "android" ? REMINDER_CHANNEL : undefined,
        },
      });
      ids.push(id);
    } else if (rec === "weekly") {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: due.getDay() + 1,
          hour: due.getHours(),
          minute: due.getMinutes(),
          channelId: Platform.OS === "android" ? REMINDER_CHANNEL : undefined,
        },
      });
      ids.push(id);
    } else {
      // none or monthly -> schedule a single dated notification (skip if past).
      if (due > new Date()) {
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: due,
            channelId: Platform.OS === "android" ? REMINDER_CHANNEL : undefined,
          },
        });
        ids.push(id);
      }
    }
    await storeKey(key, ids);
  } catch {
    // ignore
  }
}

export async function cancelReminder(id: number): Promise<void> {
  await cancelKey(`reminder:${id}`);
}

// ---------------------------------------------------------------------------
// Bulk re-sync — call on app launch / when lists load so OS schedule matches
// the user's current data even after a reboot or reinstall.
// ---------------------------------------------------------------------------
export async function syncAlarms(alarms: any[]): Promise<void> {
  for (const a of alarms) {
    if (a.enabled) await scheduleAlarm(a);
    else await cancelAlarm(a.id);
  }
}

export async function syncReminders(reminders: any[]): Promise<void> {
  for (const r of reminders) {
    if (!r.completed && r.dueAt) await scheduleReminder(r);
    else await cancelReminder(r.id);
  }
}

// ---------------------------------------------------------------------------
// DAILY MONEY ADVICE — one repeating notification each morning (08:00).
// ---------------------------------------------------------------------------
export async function scheduleDailyAdvice(hour = 8, minute = 0): Promise<void> {
  const key = "advice:daily";
  await cancelKey(key);
  if (!(await configureNotifications())) return;
  if (!(await ensurePermissions())) return;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "💡 LifePilot money tip",
        body: "Open LifePilot for today's money advice and your 70/20/10 plan.",
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === "android" ? REMINDER_CHANNEL : undefined,
      },
    });
    await storeKey(key, [id]);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// OVER-BUDGET ALERT — loud, immediate notification on the ALARM channel so it
// rings/vibrates strongly. Throttled to once per day per user.
// ---------------------------------------------------------------------------
const OVERBUDGET_KEY = "lp_overbudget_fired_v1";
export async function fireOverBudgetAlert(message: string): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const last = await storage.getItem(OVERBUDGET_KEY);
    if (last === today) return; // already alerted today
    if (!(await configureNotifications())) return;
    if (!(await ensurePermissions())) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 Spending alert",
        body: message,
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: ALARM_CHANNEL } : {}),
      },
      trigger: null, // fire immediately
    });
    await storage.setItem(OVERBUDGET_KEY, today);
  } catch {
    // ignore
  }
}

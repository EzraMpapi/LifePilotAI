export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", TZS: "TSh", KES: "KSh", NGN: "₦",
  INR: "₹", JPY: "¥", ZAR: "R", AUD: "A$", CAD: "C$",
};

export function money(amount: number, currency = "USD") {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  const sign = amount < 0 ? "-" : "";
  const v = Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${sign}${sym}${v}`;
}

export function relativeTime(date: Date | string | number) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function fmtDate(date: Date | string | number, opts?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString(undefined, opts ?? { month: "short", day: "numeric", year: "numeric" });
}

export function fmtTime(date: Date | string | number) {
  return new Date(date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function fmtTime24(t: string) {
  // "07:30" -> "7:30 AM"
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Shopping", "Bills", "Health", "Entertainment",
  "Groceries", "Rent", "Education", "Travel", "Savings", "Other",
];
export const INCOME_CATEGORIES = ["Salary", "Business", "Gift", "Investment", "Freelance", "Other"];

export const MOODS = [
  { key: "happy", icon: "Smiley", color: "#22D3A6" },
  { key: "excited", icon: "SmileyWink", color: "#F59E0B" },
  { key: "calm", icon: "SmileyMeh", color: "#3B9EFF" },
  { key: "grateful", icon: "Heart", color: "#A78BFA" },
  { key: "neutral", icon: "SmileyBlank", color: "#8A95A6" },
  { key: "anxious", icon: "SmileyNervous", color: "#FBBF24" },
  { key: "sad", icon: "SmileySad", color: "#60A5FA" },
  { key: "angry", icon: "SmileyXEyes", color: "#FF5C7C" },
];

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api as typedApi } from "./api";

// Routes use untyped c.req.json() handlers, so Hono RPC can't infer request
// bodies or narrow response unions. Cast to any for ergonomic call sites; the
// API shapes are documented per-hook below.
const api: any = typedApi;

// ---------- Generic helpers ----------
function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

// ---------- FILE UPLOAD (direct client -> Tigris) ----------
export async function uploadFile(uri: string, filename: string, contentType: string): Promise<string> {
  const res = await api.upload.presign.$post({ json: { filename, contentType } });
  const { url, key } = await res.json();
  const fileRes = await fetch(uri);
  const blob = await fileRes.blob();
  await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": contentType } });
  return key as string;
}
export async function viewUrl(key: string): Promise<string> {
  const res = await api.upload.view.$post({ json: { key } });
  const { url } = await res.json();
  return url as string;
}
export async function readReceipt(key: string) {
  const res = await api["ai"]["read-receipt"].$post({ json: { key } });
  return res.json();
}

// ---------- MONEY (70/20/10 plan + daily advice) ----------
export function useMoneyPlan() {
  return useQuery({ queryKey: ["money-plan"], queryFn: async () => (await api.money.plan.$get()).json() });
}
export function useMoneyAdvice() {
  return useQuery({ queryKey: ["money-advice"], queryFn: async () => (await api.money.advice.$get()).json(), staleTime: 1000 * 60 * 30 });
}

// ---------- DASHBOARD ----------
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.dashboard.$get()).json(),
  });
}

// ---------- SETTINGS ----------
export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: async () => (await api.settings.$get()).json() });
}
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.settings.$put({ json: data })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

// ---------- TRANSACTIONS ----------
export function useTransactions() {
  return useQuery({ queryKey: ["transactions"], queryFn: async () => (await api.transactions.$get()).json() });
}
export function useFinanceReport(period: string) {
  return useQuery({
    queryKey: ["finance-report", period],
    queryFn: async () => (await api.finance.report.$get({ query: { period } })).json(),
  });
}
export function useAddTransaction() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (data: any) => (await api.transactions.$post({ json: data })).json(),
    onSuccess: () => inv(["transactions", "finance-report", "dashboard", "reports", "money-plan", "money-advice"]),
  });
}
export function useDeleteTransaction() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.transactions[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["transactions", "finance-report", "dashboard", "money-plan"]),
  });
}

// ---------- BUDGETS ----------
export function useBudgets() {
  return useQuery({ queryKey: ["budgets"], queryFn: async () => (await api.budgets.$get()).json() });
}
export function useAddBudget() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (data: any) => (await api.budgets.$post({ json: data })).json(),
    onSuccess: () => inv(["budgets"]),
  });
}
export function useDeleteBudget() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.budgets[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["budgets"]),
  });
}

// ---------- DIARY ----------
export function useDiary() {
  return useQuery({ queryKey: ["diary"], queryFn: async () => (await api.diary.$get()).json() });
}
export function useAddDiary() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (data: any) => (await api.diary.$post({ json: data })).json(),
    onSuccess: () => inv(["diary"]),
  });
}
export function useUpdateDiary() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => (await api.diary[":id"].$put({ param: { id: String(id) }, json: data })).json(),
    onSuccess: () => inv(["diary"]),
  });
}
export function useDeleteDiary() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.diary[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["diary"]),
  });
}

// ---------- REMINDERS ----------
export function useReminders() {
  return useQuery({ queryKey: ["reminders"], queryFn: async () => (await api.reminders.$get()).json() });
}
export function useAddReminder() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (data: any) => (await api.reminders.$post({ json: data })).json(),
    onSuccess: () => inv(["reminders", "dashboard"]),
  });
}
export function useToggleReminder() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.reminders[":id"].toggle.$post({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["reminders", "dashboard"]),
  });
}
export function useDeleteReminder() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.reminders[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["reminders", "dashboard"]),
  });
}

// ---------- ALARMS ----------
export function useAlarms() {
  return useQuery({ queryKey: ["alarms"], queryFn: async () => (await api.alarms.$get()).json() });
}
export function useAddAlarm() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (data: any) => (await api.alarms.$post({ json: data })).json(),
    onSuccess: () => inv(["alarms"]),
  });
}
export function useToggleAlarm() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.alarms[":id"].toggle.$post({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["alarms"]),
  });
}
export function useDeleteAlarm() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.alarms[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["alarms"]),
  });
}

// ---------- GOALS ----------
export function useGoals() {
  return useQuery({ queryKey: ["goals"], queryFn: async () => (await api.goals.$get()).json() });
}
export function useAddGoal() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (data: any) => (await api.goals.$post({ json: data })).json(),
    onSuccess: () => inv(["goals", "dashboard"]),
  });
}
export function useUpdateGoal() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => (await api.goals[":id"].$put({ param: { id: String(id) }, json: data })).json(),
    onSuccess: () => inv(["goals", "dashboard"]),
  });
}
export function useDeleteGoal() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.goals[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["goals", "dashboard"]),
  });
}

// ---------- HABITS ----------
export function useHabits() {
  return useQuery({ queryKey: ["habits"], queryFn: async () => (await api.habits.$get()).json() });
}
export function useAddHabit() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (data: any) => (await api.habits.$post({ json: data })).json(),
    onSuccess: () => inv(["habits", "dashboard"]),
  });
}
export function useLogHabit() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, delta, date }: { id: number; delta: number; date?: string }) =>
      (await api.habits[":id"].log.$post({ param: { id: String(id) }, json: { delta, date } })).json(),
    onSuccess: () => inv(["habits", "dashboard"]),
  });
}
export function useDeleteHabit() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.habits[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["habits", "dashboard"]),
  });
}

// ---------- TIMETABLE ----------
export function useTimetable() {
  return useQuery({ queryKey: ["timetable"], queryFn: async () => (await api.timetable.$get()).json() });
}
export function useAddTimetable() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (data: any) => (await api.timetable.$post({ json: data })).json(),
    onSuccess: () => inv(["timetable", "dashboard"]),
  });
}
export function useDeleteTimetable() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.timetable[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["timetable", "dashboard"]),
  });
}

// ---------- NOTES ----------
export function useNotes() {
  return useQuery({ queryKey: ["notes"], queryFn: async () => (await api.notes.$get()).json() });
}
export function useAddNote() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (data: any) => (await api.notes.$post({ json: data })).json(),
    onSuccess: () => inv(["notes"]),
  });
}
export function useUpdateNote() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => (await api.notes[":id"].$put({ param: { id: String(id) }, json: data })).json(),
    onSuccess: () => inv(["notes"]),
  });
}
export function useFavoriteNote() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.notes[":id"].favorite.$post({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["notes"]),
  });
}
export function useDeleteNote() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.notes[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["notes"]),
  });
}

// ---------- LOCATIONS ----------
export function useLocations() {
  return useQuery({ queryKey: ["locations"], queryFn: async () => (await api.locations.$get()).json() });
}
export function useAddLocation() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (data: any) => (await api.locations.$post({ json: data })).json(),
    onSuccess: () => inv(["locations", "reports"]),
  });
}
export function useFavoriteLocation() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.locations[":id"].favorite.$post({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["locations"]),
  });
}
export function useDeleteLocation() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => (await api.locations[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => inv(["locations", "reports"]),
  });
}
export function useClearLocations() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async () => (await api.locations.$delete()).json(),
    onSuccess: () => inv(["locations", "reports"]),
  });
}

// ---------- REPORTS ----------
export function useReport(range: string) {
  return useQuery({
    queryKey: ["reports", range],
    queryFn: async () => (await api.reports.$get({ query: { range } })).json(),
  });
}

// ---------- SEARCH ----------
export function useSearch(q: string) {
  return useQuery({
    queryKey: ["search", q],
    enabled: q.trim().length > 0,
    queryFn: async () => (await api.search.$get({ query: { q } })).json(),
  });
}

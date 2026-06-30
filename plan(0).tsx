import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Switch, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Plus, CheckCircle, CircleIcon, Trash, Alarm, Bell, CalendarBlank, GridFour, MoonStars,
} from "phosphor-react-native";
import { useTheme, CHART_COLORS } from "../../lib/theme";
import {
  useReminders, useAddReminder, useToggleReminder, useDeleteReminder,
  useAlarms, useAddAlarm, useToggleAlarm, useDeleteAlarm,
  useTimetable, useAddTimetable, useDeleteTimetable,
} from "../../lib/hooks";
import { Card, Txt, Label, Button, Input, Pill, Sheet, EmptyState } from "../../components/ui";
import { fmtTime, fmtTime24, fmtDate, DAYS } from "../../lib/format";
import { useT } from "../../lib/i18n";
import {
  scheduleAlarm, cancelAlarm, scheduleReminder, cancelReminder,
  syncAlarms, syncReminders,
} from "../../lib/notify";
import { useEffect } from "react";

type SubTab = "reminders" | "alarms" | "timetable" | "calendar";

export default function Plan() {
  const { c } = useTheme();
  const t = useT();
  const [sub, setSub] = useState<SubTab>("reminders");

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ color: c.text, fontSize: 26, fontWeight: "800" }}>{t("plan.title")}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 12 }} style={{ flexGrow: 0 }}>
          <Pill label={t("plan.reminders")} active={sub === "reminders"} onPress={() => setSub("reminders")} />
          <Pill label={t("plan.alarms")} active={sub === "alarms"} onPress={() => setSub("alarms")} />
          <Pill label={t("plan.timetable")} active={sub === "timetable"} onPress={() => setSub("timetable")} />
          <Pill label={t("plan.calendar")} active={sub === "calendar"} onPress={() => setSub("calendar")} />
        </ScrollView>

        {sub === "reminders" && <RemindersView />}
        {sub === "alarms" && <AlarmsView />}
        {sub === "timetable" && <TimetableView />}
        {sub === "calendar" && <CalendarView />}
      </SafeAreaView>
    </View>
  );
}

function FAB({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={{
      position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29,
      backgroundColor: c.accent, alignItems: "center", justifyContent: "center", elevation: 6,
      shadowColor: c.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    }}>
      <Plus size={28} color="#fff" weight="bold" />
    </Pressable>
  );
}

// -------------------- REMINDERS --------------------
function RemindersView() {
  const { c } = useTheme();
  const t = useT();
  const { data } = useReminders();
  const add = useAddReminder();
  const toggle = useToggleReminder();
  const del = useDeleteReminder();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [recurrence, setRecurrence] = useState("none");
  const [hasDue, setHasDue] = useState(true);
  const [hours, setHours] = useState("9");
  const [mins, setMins] = useState("00");

  const reminders = data?.reminders ?? [];
  const active = reminders.filter((r: any) => !r.completed);
  const done = reminders.filter((r: any) => r.completed);

  // Keep OS schedule in sync with current reminders (covers reboots/reinstalls).
  useEffect(() => { if (reminders.length) syncReminders(reminders); }, [reminders]);

  function save() {
    if (!title.trim()) return;
    let dueAt = null;
    if (hasDue) {
      const d = new Date();
      d.setHours(Number(hours) || 9, Number(mins) || 0, 0, 0);
      if (d < new Date()) d.setDate(d.getDate() + 1);
      dueAt = d.toISOString();
    }
    add.mutate(
      { title, notes, priority, recurrence, dueAt },
      {
        onSuccess: (created: any) => {
          const r = created?.reminder ?? created;
          if (r?.id) scheduleReminder({ id: r.id, title, dueAt, recurrence });
        },
      }
    );
    setTitle(""); setNotes(""); setOpen(false);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 100 }}>
        {reminders.length === 0 ? (
          <EmptyState icon={<Bell size={40} color={c.textFaint} />} title={t("plan.noReminders")} subtitle={t("plan.noRemindersSub")} action={<Button title={t("plan.addReminder")} small onPress={() => setOpen(true)} />} />
        ) : (
          <>
            {active.map((r: any) => <ReminderRow key={r.id} r={r} toggle={toggle} del={del} />)}
            {done.length > 0 && <Text style={{ color: c.textMuted, fontWeight: "600", marginTop: 18, marginBottom: 10 }}>{t("plan.completed")}</Text>}
            {done.map((r: any) => <ReminderRow key={r.id} r={r} toggle={toggle} del={del} />)}
          </>
        )}
      </ScrollView>
      <FAB onPress={() => setOpen(true)} />

      <Sheet visible={open} onClose={() => setOpen(false)} title={t("plan.newReminder")}>
        <Label>{t("diary.entryTitle")}</Label>
        <Input value={title} onChangeText={setTitle} placeholder={t("plan.whatNeedsDoing")} style={{ marginTop: 6, marginBottom: 14 }} autoFocus />
        <Label>{t("plan.notes")}</Label>
        <Input value={notes} onChangeText={setNotes} placeholder={t("plan.optionalDetails")} style={{ marginTop: 6, marginBottom: 14 }} />
        <Label>{t("plan.priority")}</Label>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 14 }}>
          {["low", "medium", "high"].map((p) => <Pill key={p} label={t(("plan.prio" + p[0].toUpperCase() + p.slice(1)) as any)} active={priority === p} onPress={() => setPriority(p)} color={p === "high" ? c.danger : p === "medium" ? c.warn : undefined} />)}
        </View>
        <Label>{t("plan.repeat")}</Label>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {["none", "daily", "weekly", "monthly"].map((r) => <Pill key={r} label={t(("plan.rec" + r[0].toUpperCase() + r.slice(1)) as any)} active={recurrence === r} onPress={() => setRecurrence(r)} />)}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Label>{t("plan.setDueTime")}</Label>
          <Switch value={hasDue} onValueChange={setHasDue} trackColor={{ true: c.accent }} />
        </View>
        {hasDue && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Input value={hours} onChangeText={setHours} placeholder="9" keyboardType="numeric" style={{ width: 70 }} />
            <Text style={{ color: c.text, fontSize: 20, fontWeight: "700" }}>:</Text>
            <Input value={mins} onChangeText={setMins} placeholder="00" keyboardType="numeric" style={{ width: 70 }} />
            <Text style={{ color: c.textMuted }}>{t("plan.timeHint")}</Text>
          </View>
        )}
        <Button title={t("plan.saveReminder")} onPress={save} loading={add.isPending} />
      </Sheet>
    </View>
  );
}

function ReminderRow({ r, toggle, del }: any) {
  const { c } = useTheme();
  const overdue = !r.completed && r.dueAt && new Date(r.dueAt) < new Date();
  const onToggle = () => {
    // If marking complete, drop its scheduled alert; if un-completing, restore it.
    if (!r.completed) cancelReminder(r.id);
    else scheduleReminder({ id: r.id, title: r.title, dueAt: r.dueAt, recurrence: r.recurrence });
    toggle.mutate(r.id);
  };
  const onDelete = () => { cancelReminder(r.id); del.mutate(r.id); };
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, marginBottom: 10 }}>
      <Pressable onPress={onToggle}>
        {r.completed ? <CheckCircle size={24} color={c.accent2} weight="fill" /> : <CircleIcon size={24} color={c.textFaint} />}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Txt weight="500" style={r.completed ? { textDecorationLine: "line-through", color: c.textFaint } : undefined}>{r.title}</Txt>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
          {r.dueAt ? <Txt size={12} color={overdue ? c.danger : c.textMuted}>{fmtDate(r.dueAt, { month: "short", day: "numeric" })} {fmtTime(r.dueAt)}</Txt> : null}
          {r.recurrence !== "none" ? <Txt size={12} color={c.accent}>· {r.recurrence}</Txt> : null}
        </View>
      </View>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.priority === "high" ? c.danger : r.priority === "medium" ? c.warn : c.textFaint }} />
      <Pressable onPress={onDelete}><Trash size={18} color={c.textFaint} /></Pressable>
    </Card>
  );
}

// -------------------- ALARMS --------------------
function AlarmsView() {
  const { c } = useTheme();
  const t = useT();
  const { data } = useAlarms();
  const add = useAddAlarm();
  const toggle = useToggleAlarm();
  const del = useDeleteAlarm();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Alarm");  // default label kept as data
  const [hours, setHours] = useState("7");
  const [mins, setMins] = useState("30");
  const [days, setDays] = useState<number[]>([]);
  const [vibrate, setVibrate] = useState(true);
  const [isBedtime, setIsBedtime] = useState(false);

  const alarms = data?.alarms ?? [];

  // Keep OS alarm schedule in sync (covers reboots / fresh installs).
  useEffect(() => { if (alarms.length) syncAlarms(alarms); }, [alarms]);

  function save() {
    const time = `${String(Number(hours)).padStart(2, "0")}:${String(Number(mins)).padStart(2, "0")}`;
    const daysStr = days.sort().join(",");
    add.mutate(
      { label, time, days: daysStr, vibrate, isBedtime },
      {
        onSuccess: (created: any) => {
          const a = created?.alarm ?? created;
          if (a?.id) scheduleAlarm({ id: a.id, label, time, days: daysStr, enabled: true });
        },
      }
    );
    setLabel("Alarm"); setDays([]); setIsBedtime(false); setOpen(false);
  }

  const onToggleAlarm = (a: any) => {
    if (a.enabled) cancelAlarm(a.id);
    else scheduleAlarm({ id: a.id, label: a.label, time: a.time, days: a.days, enabled: true });
    toggle.mutate(a.id);
  };
  const onDeleteAlarm = (id: number) => { cancelAlarm(id); del.mutate(id); };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 100 }}>
        {alarms.length === 0 ? (
          <EmptyState icon={<Alarm size={40} color={c.textFaint} />} title={t("plan.noAlarms")} subtitle={t("plan.noAlarmsSub")} action={<Button title={t("plan.addAlarm")} small onPress={() => setOpen(true)} />} />
        ) : alarms.map((a: any) => (
          <Card key={a.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {a.isBedtime ? <MoonStars size={18} color={c.accent} weight="duotone" /> : <Alarm size={18} color={c.accent} weight="duotone" />}
                <Text style={{ color: a.enabled ? c.text : c.textFaint, fontSize: 30, fontWeight: "800" }}>{fmtTime24(a.time)}</Text>
              </View>
              <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>
                {a.label}{a.days ? ` · ${a.days.split(",").map((d: string) => DAYS[Number(d)]).join(" ")}` : ` · ${t("plan.once")}`}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 8 }}>
              <Switch value={a.enabled} onValueChange={() => onToggleAlarm(a)} trackColor={{ true: c.accent }} />
              <Pressable onPress={() => onDeleteAlarm(a.id)}><Trash size={16} color={c.textFaint} /></Pressable>
            </View>
          </Card>
        ))}
      </ScrollView>
      <FAB onPress={() => setOpen(true)} />

      <Sheet visible={open} onClose={() => setOpen(false)} title={t("plan.newAlarm")}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginVertical: 16 }}>
          <Input value={hours} onChangeText={setHours} keyboardType="numeric" style={{ width: 80, textAlign: "center" }} />
          <Text style={{ color: c.text, fontSize: 28, fontWeight: "800" }}>:</Text>
          <Input value={mins} onChangeText={setMins} keyboardType="numeric" style={{ width: 80, textAlign: "center" }} />
        </View>
        <Label>{t("plan.label")}</Label>
        <Input value={label} onChangeText={setLabel} placeholder={t("plan.wakeUp")} style={{ marginTop: 6, marginBottom: 14 }} />
        <Label>{t("plan.repeatOn")}</Label>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 8, marginBottom: 14, justifyContent: "space-between" }}>
          {DAYS.map((d, i) => {
            const on = days.includes(i);
            return (
              <Pressable key={i} onPress={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])} style={{
                width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
                backgroundColor: on ? c.accent : c.surfaceAlt, borderWidth: 1, borderColor: on ? c.accent : c.border,
              }}>
                <Text style={{ color: on ? "#fff" : c.textMuted, fontWeight: "600", fontSize: 12 }}>{d[0]}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Label>{t("plan.vibrate")}</Label>
          <Switch value={vibrate} onValueChange={setVibrate} trackColor={{ true: c.accent }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Label>{t("plan.bedtime")}</Label>
          <Switch value={isBedtime} onValueChange={setIsBedtime} trackColor={{ true: c.accent }} />
        </View>
        <Button title={t("plan.saveAlarm")} onPress={save} loading={add.isPending} />
      </Sheet>
    </View>
  );
}

// -------------------- TIMETABLE --------------------
function TimetableView() {
  const { c } = useTheme();
  const t = useT();
  const { data } = useTimetable();
  const add = useAddTimetable();
  const del = useDeleteTimetable();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(new Date().getDay());
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [color, setColor] = useState(CHART_COLORS[0]);
  const [location, setLocation] = useState("");

  const entries = data?.timetable ?? [];

  function save() {
    if (!title.trim()) return;
    add.mutate({ title, dayOfWeek: day, startTime: start, endTime: end, color, location });
    setTitle(""); setLocation(""); setOpen(false);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 100 }}>
        {entries.length === 0 ? (
          <EmptyState icon={<GridFour size={40} color={c.textFaint} />} title={t("plan.emptyTimetable")} subtitle={t("plan.emptyTimetableSub")} action={<Button title={t("plan.addSlot")} small onPress={() => setOpen(true)} />} />
        ) : DAYS.map((dayName, di) => {
          const dayEntries = entries.filter((e: any) => e.dayOfWeek === di).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
          if (!dayEntries.length) return null;
          return (
            <View key={di} style={{ marginBottom: 18 }}>
              <Text style={{ color: c.textMuted, fontWeight: "700", marginBottom: 8 }}>{dayName.toUpperCase()}</Text>
              {dayEntries.map((e: any) => (
                <Card key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, marginBottom: 8 }}>
                  <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: e.color }} />
                  <View style={{ flex: 1 }}>
                    <Txt weight="600">{e.title}</Txt>
                    <Txt size={12} color={c.textMuted}>{fmtTime24(e.startTime)} – {fmtTime24(e.endTime)}{e.location ? ` · ${e.location}` : ""}</Txt>
                  </View>
                  <Pressable onPress={() => del.mutate(e.id)}><Trash size={16} color={c.textFaint} /></Pressable>
                </Card>
              ))}
            </View>
          );
        })}
      </ScrollView>
      <FAB onPress={() => setOpen(true)} />

      <Sheet visible={open} onClose={() => setOpen(false)} title={t("plan.newSlot")}>
        <Label>{t("diary.entryTitle")}</Label>
        <Input value={title} onChangeText={setTitle} placeholder={t("plan.slotTitlePlaceholder")} style={{ marginTop: 6, marginBottom: 14 }} autoFocus />
        <Label>{t("plan.day")}</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
          {DAYS.map((d, i) => <Pill key={i} label={d} active={day === i} onPress={() => setDay(i)} />)}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
          <View style={{ flex: 1 }}><Label>{t("plan.start")}</Label><Input value={start} onChangeText={setStart} placeholder="09:00" style={{ marginTop: 6 }} /></View>
          <View style={{ flex: 1 }}><Label>{t("plan.end")}</Label><Input value={end} onChangeText={setEnd} placeholder="10:00" style={{ marginTop: 6 }} /></View>
        </View>
        <Label>{t("plan.location")}</Label>
        <Input value={location} onChangeText={setLocation} placeholder={t("plan.optional")} style={{ marginTop: 6, marginBottom: 14 }} />
        <Label>{t("plan.color")}</Label>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10, marginBottom: 16 }}>
          {CHART_COLORS.slice(0, 6).map((col) => (
            <Pressable key={col} onPress={() => setColor(col)} style={{
              width: 36, height: 36, borderRadius: 18, backgroundColor: col,
              borderWidth: color === col ? 3 : 0, borderColor: c.text,
            }} />
          ))}
        </View>
        <Button title={t("plan.saveSlot")} onPress={save} loading={add.isPending} />
      </Sheet>
    </View>
  );
}

// -------------------- CALENDAR --------------------
function CalendarView() {
  const { c } = useTheme();
  const t = useT();
  const { data: remData } = useReminders();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());

  const reminders = remData?.reminders ?? [];
  const year = month.getFullYear(), m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const dayKey = (d: number) => new Date(year, m, d).toDateString();
  const remByDay = (d: number) => reminders.filter((r: any) => r.dueAt && new Date(r.dueAt).toDateString() === dayKey(d));
  const selectedRems = reminders.filter((r: any) => r.dueAt && new Date(r.dueAt).toDateString() === selected.toDateString());

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Pressable onPress={() => setMonth(new Date(year, m - 1, 1))}><Text style={{ color: c.accent, fontSize: 20 }}>‹</Text></Pressable>
          <Text style={{ color: c.text, fontWeight: "700", fontSize: 17 }}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text>
          <Pressable onPress={() => setMonth(new Date(year, m + 1, 1))}><Text style={{ color: c.accent, fontSize: 20 }}>›</Text></Pressable>
        </View>
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {DAYS.map((d) => <Text key={d} style={{ flex: 1, textAlign: "center", color: c.textFaint, fontSize: 12, fontWeight: "600" }}>{d[0]}</Text>)}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((cell, i) => {
            if (cell === null) return <View key={i} style={{ width: `${100 / 7}%`, height: 44 }} />;
            const isToday = dayKey(cell) === new Date().toDateString();
            const isSel = dayKey(cell) === selected.toDateString();
            const hasRem = remByDay(cell).length > 0;
            return (
              <Pressable key={i} onPress={() => setSelected(new Date(year, m, cell))} style={{ width: `${100 / 7}%`, height: 44, alignItems: "center", justifyContent: "center" }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
                  backgroundColor: isSel ? c.accent : isToday ? c.surfaceAlt : "transparent",
                }}>
                  <Text style={{ color: isSel ? "#fff" : c.text, fontWeight: isToday ? "800" : "500" }}>{cell}</Text>
                </View>
                {hasRem ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isSel ? c.accent : c.accent2, position: "absolute", bottom: 4 }} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Text style={{ color: c.text, fontWeight: "700", fontSize: 16, marginTop: 20, marginBottom: 10 }}>
        {selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </Text>
      {selectedRems.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 22 }}><Txt color={c.textMuted}>{t("plan.nothingScheduled")}</Txt></Card>
      ) : selectedRems.map((r: any) => (
        <Card key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10, paddingVertical: 14 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.completed ? c.accent2 : c.accent }} />
          <View style={{ flex: 1 }}>
            <Txt weight="500" style={r.completed ? { textDecorationLine: "line-through", color: c.textFaint } : undefined}>{r.title}</Txt>
            <Txt size={12} color={c.textMuted}>{fmtTime(r.dueAt)}</Txt>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

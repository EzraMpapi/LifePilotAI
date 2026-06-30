import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import { Plus, Trash, Fire, CheckCircle, Minus } from "phosphor-react-native";
import { useTheme, CHART_COLORS } from "../lib/theme";
import { useHabits, useAddHabit, useDeleteHabit, useLogHabit } from "../lib/hooks";
import { Card, Txt, Label, Button, Input, Sheet, EmptyState, ScreenHeader, IconButton, ProgressBar } from "../components/ui";
import { BarChart } from "../components/charts";
import { todayKey, DAYS } from "../lib/format";
import { useT } from "../lib/i18n";

const ICONS = ["Drop", "BookOpen", "Barbell", "HandsPraying", "Bed", "Coffee", "PersonSimpleRun", "Brain", "Leaf", "Heart"];

export default function Habits() {
  const { c } = useTheme();
  const router = useRouter();
  const t = useT();
  const { data } = useHabits();
  const add = useAddHabit();
  const del = useDeleteHabit();
  const log = useLogHabit();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Drop");
  const [color, setColor] = useState(CHART_COLORS[0]);
  const [target, setTarget] = useState("1");
  const [unit, setUnit] = useState("times");

  const habits = data?.habits ?? [];
  const logs = data?.logs ?? [];
  const today = todayKey();
  const countFor = (id: number, date = today) =>
    logs.filter((l: any) => l.habitId === id && l.date === date).reduce((a: number, l: any) => a + l.count, 0);

  // last 7 days check-in totals
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const total = logs.filter((l: any) => l.date === key).reduce((a: number, l: any) => a + l.count, 0);
    return { label: DAYS[d.getDay()], value: total };
  });

  function save() {
    if (!name.trim()) return;
    add.mutate({ name, icon, color, targetPerDay: Number(target) || 1, unit });
    setOpen(false); setName(""); setTarget("1"); setUnit("times");
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("habits.title")} onBack={() => router.back()}
          right={<IconButton onPress={() => setOpen(true)}><Plus size={20} color={c.text} weight="bold" /></IconButton>} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {habits.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <Label>{t("habits.checkins7d")}</Label>
              <View style={{ height: 12 }} />
              <BarChart data={last7} color={c.accent} />
            </Card>
          )}

          {habits.length === 0 ? (
            <EmptyState icon={<Fire size={40} color={c.accent} weight="duotone" />}
              title={t("habits.noHabits")} subtitle={t("habits.noHabitsSub")}
              action={<Button title={t("habits.addHabit")} onPress={() => setOpen(true)} small />} />
          ) : (
            <View style={{ gap: 12 }}>
              {habits.map((h: any) => {
                const count = countFor(h.id);
                const done = count >= h.targetPerDay;
                const pct = Math.min(100, (count / h.targetPerDay) * 100);
                const Ic = (Icons as any)[h.icon] ?? Fire;
                return (
                  <Card key={h.id}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: h.color + "22", alignItems: "center", justifyContent: "center" }}>
                        {done ? <CheckCircle size={24} color={h.color} weight="fill" /> : <Ic size={22} color={h.color} weight="duotone" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt weight="700" size={16}>{h.name}</Txt>
                        <Txt size={12} color={c.textMuted}>{count} / {h.targetPerDay} {h.unit}</Txt>
                      </View>
                      <Pressable onPress={() => del.mutate(h.id)} hitSlop={10}><Trash size={18} color={c.textFaint} /></Pressable>
                    </View>
                    <View style={{ marginTop: 12 }}><ProgressBar value={pct} color={h.color} height={6} /></View>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                      <Pressable onPress={() => log.mutate({ id: h.id, delta: -1 })} style={{ flex: 1, height: 38, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                        <Minus size={16} color={c.text} weight="bold" />
                      </Pressable>
                      <Pressable onPress={() => log.mutate({ id: h.id, delta: 1 })} style={{ flex: 2, height: 38, borderRadius: 12, backgroundColor: h.color, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                        <Plus size={16} color="#fff" weight="bold" /><Text style={{ color: "#fff", fontWeight: "700" }}>{t("habits.checkIn")}</Text>
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </ScrollView>

        <Sheet visible={open} onClose={() => setOpen(false)} title={t("habits.newHabit")}>
          <Label>{t("habits.name")}</Label>
          <View style={{ height: 8 }} />
          <Input value={name} onChangeText={setName} placeholder={t("habits.namePlaceholder")} />
          <View style={{ height: 16 }} />
          <Label>{t("habits.icon")}</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {ICONS.map((ic) => {
              const Ic = (Icons as any)[ic] ?? Fire;
              const active = icon === ic;
              return (
                <Pressable key={ic} onPress={() => setIcon(ic)} style={{
                  width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: active ? color + "33" : c.surfaceAlt, borderWidth: 1.5, borderColor: active ? color : c.border,
                }}>
                  <Ic size={22} color={active ? color : c.textMuted} weight="duotone" />
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: 16 }} />
          <Label>{t("habits.color")}</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {CHART_COLORS.map((col) => (
              <Pressable key={col} onPress={() => setColor(col)} style={{
                width: 36, height: 36, borderRadius: 18, backgroundColor: col,
                borderWidth: 3, borderColor: color === col ? c.text : "transparent",
              }} />
            ))}
          </View>
          <View style={{ height: 16 }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>{t("habits.targetDay")}</Label>
              <View style={{ height: 8 }} />
              <Input value={target} onChangeText={setTarget} placeholder="1" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Label>{t("habits.unit")}</Label>
              <View style={{ height: 8 }} />
              <Input value={unit} onChangeText={setUnit} placeholder={t("habits.unitPlaceholder")} />
            </View>
          </View>
          <View style={{ height: 24 }} />
          <Button title={t("habits.addHabit")} onPress={save} loading={add.isPending} />
        </Sheet>
      </SafeAreaView>
    </View>
  );
}

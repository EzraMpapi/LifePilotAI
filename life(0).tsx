import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  BookOpen, Target, Fire, NotePencil, MapPin, CaretRight, ChartLine, CheckCircle, Plus, Minus,
} from "phosphor-react-native";
import { useTheme } from "../../lib/theme";
import { useHabits, useLogHabit, useGoals } from "../../lib/hooks";
import { Card, Txt, Label, SectionHeader, ProgressBar } from "../../components/ui";
import { todayKey } from "../../lib/format";
import { useT } from "../../lib/i18n";

const HUBS = [
  { key: "diary", titleKey: "life.diaryTitle", subKey: "life.diarySub", icon: BookOpen, color: "#6C5CE7", route: "/diary" },
  { key: "goals", titleKey: "life.goals", subKey: "life.goalsSub", icon: Target, color: "#22D3A6", route: "/goals" },
  { key: "notes", titleKey: "notes.title", subKey: "life.notesSub", icon: NotePencil, color: "#3B9EFF", route: "/notes" },
  { key: "timeline", titleKey: "life.placesTitle", subKey: "life.placesSub", icon: MapPin, color: "#F59E0B", route: "/timeline" },
  { key: "reports", titleKey: "reports.title", subKey: "life.reportsSub", icon: ChartLine, color: "#FF5C7C", route: "/reports" },
] as const;

export default function Life() {
  const { c } = useTheme();
  const router = useRouter();
  const t = useT();
  const { data: habitData } = useHabits();
  const { data: goalData } = useGoals();
  const log = useLogHabit();

  const habits = habitData?.habits ?? [];
  const logs = habitData?.logs ?? [];
  const today = todayKey();
  const countFor = (id: number) => logs.filter((l: any) => l.habitId === id && l.date === today).reduce((a: any, l: any) => a + l.count, 0);
  const activeGoals = (goalData?.goals ?? []).filter((g: any) => !g.completed);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: c.text, fontSize: 26, fontWeight: "800", marginBottom: 18 }}>{t("life.title")}</Text>

          {/* Habits quick tracker */}
          <SectionHeader title={t("life.todayHabits")} actionLabel={t("life.manage")} onAction={() => router.push("/habits")} />
          {habits.length === 0 ? (
            <Card onPress={() => router.push("/habits")} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <Fire size={22} color={c.accent} weight="duotone" />
              <Text style={{ color: c.textMuted, flex: 1 }}>{t("life.startTracking")}</Text>
              <CaretRight size={16} color={c.textFaint} />
            </Card>
          ) : (
            <View style={{ gap: 10, marginBottom: 20 }}>
              {habits.map((h: any) => {
                const count = countFor(h.id);
                const done = count >= h.targetPerDay;
                const pct = Math.min(100, (count / h.targetPerDay) * 100);
                return (
                  <Card key={h.id}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: h.color + "22", alignItems: "center", justifyContent: "center" }}>
                        {done ? <CheckCircle size={22} color={h.color} weight="fill" /> : <Fire size={20} color={h.color} weight="duotone" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt weight="600">{h.name}</Txt>
                        <Txt size={12} color={c.textMuted}>{count} / {h.targetPerDay} {h.unit}</Txt>
                      </View>
                      <Pressable onPress={() => log.mutate({ id: h.id, delta: -1 })} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                        <Minus size={16} color={c.text} weight="bold" />
                      </Pressable>
                      <Pressable onPress={() => log.mutate({ id: h.id, delta: 1 })} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: h.color, alignItems: "center", justifyContent: "center" }}>
                        <Plus size={16} color="#fff" weight="bold" />
                      </Pressable>
                    </View>
                    <View style={{ marginTop: 10 }}><ProgressBar value={pct} color={h.color} height={6} /></View>
                  </Card>
                );
              })}
            </View>
          )}

          {/* Active goals preview */}
          {activeGoals.length > 0 && (
            <>
              <SectionHeader title={t("life.goals")} actionLabel={t("life.seeAll")} onAction={() => router.push("/goals")} />
              <View style={{ gap: 10, marginBottom: 20 }}>
                {activeGoals.slice(0, 3).map((g: any) => {
                  const pct = Math.round((g.currentValue / g.targetValue) * 100);
                  return (
                    <Card key={g.id} onPress={() => router.push("/goals")}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                        <Txt weight="600" numberOfLines={1} style={{ flex: 1 }}>{g.title}</Txt>
                        <Txt weight="700" color={c.accent2}>{pct}%</Txt>
                      </View>
                      <ProgressBar value={pct} color={c.accent2} />
                    </Card>
                  );
                })}
              </View>
            </>
          )}

          {/* Hub navigation */}
          <SectionHeader title={t("life.explore")} />
          <View style={{ gap: 10 }}>
            {HUBS.map((h) => {
              const Icon = h.icon;
              return (
                <Card key={h.key} onPress={() => router.push(h.route as any)} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: h.color + "22", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={24} color={h.color} weight="duotone" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt weight="700" size={16}>{t(h.titleKey)}</Txt>
                    <Txt size={13} color={c.textMuted}>{t(h.subKey)}</Txt>
                  </View>
                  <CaretRight size={18} color={c.textFaint} />
                </Card>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

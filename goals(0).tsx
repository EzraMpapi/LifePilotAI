import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Plus, Trash, Target, CheckCircle, Minus } from "phosphor-react-native";
import { useTheme } from "../lib/theme";
import { useGoals, useAddGoal, useUpdateGoal, useDeleteGoal } from "../lib/hooks";
import { Card, Txt, Label, Button, Input, Pill, Sheet, EmptyState, ScreenHeader, IconButton, ProgressBar } from "../components/ui";
import { useT } from "../lib/i18n";

const HORIZONS = ["daily", "weekly", "monthly", "yearly", "5year"];
const CATEGORIES = ["personal", "career", "health", "finance", "learning", "relationships"];

export default function Goals() {
  const { c } = useTheme();
  const router = useRouter();
  const t = useT();
  const { data } = useGoals();
  const add = useAddGoal();
  const update = useUpdateGoal();
  const del = useDeleteGoal();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("personal");
  const [horizon, setHorizon] = useState("monthly");
  const [targetValue, setTargetValue] = useState("100");
  const [unit, setUnit] = useState("%");

  const goals = data?.goals ?? [];
  const shown = goals.filter((g: any) => filter === "all" ? true : g.horizon === filter);

  function save() {
    if (!title.trim()) return;
    add.mutate({
      title, description: desc, category, horizon,
      targetValue: Number(targetValue) || 100, currentValue: 0, unit,
    });
    setOpen(false); setTitle(""); setDesc(""); setTargetValue("100"); setUnit("%");
  }

  function bump(g: any, delta: number) {
    const step = Math.max(1, Math.round(g.targetValue * 0.1));
    const next = Math.max(0, Math.min(g.targetValue, g.currentValue + delta * step));
    update.mutate({ id: g.id, currentValue: next, completed: next >= g.targetValue });
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("goals.title")} onBack={() => router.back()}
          right={<IconButton onPress={() => setOpen(true)}><Plus size={20} color={c.text} weight="bold" /></IconButton>} />
        <View style={{ paddingHorizontal: 20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            <Pill label={t("common.all")} active={filter === "all"} onPress={() => setFilter("all")} />
            {HORIZONS.map((h) => <Pill key={h} label={h} active={filter === h} onPress={() => setFilter(h)} />)}
          </ScrollView>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {shown.length === 0 ? (
            <EmptyState icon={<Target size={40} color={c.accent2} weight="duotone" />}
              title={t("goals.noGoals")} subtitle={t("goals.noGoalsSub")}
              action={<Button title={t("goals.addGoal")} onPress={() => setOpen(true)} small />} />
          ) : (
            <View style={{ gap: 12 }}>
              {shown.map((g: any) => {
                const pct = Math.round((g.currentValue / g.targetValue) * 100);
                return (
                  <Card key={g.id}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          {g.completed ? <CheckCircle size={18} color={c.accent2} weight="fill" /> : null}
                          <Txt weight="700" size={16} style={{ flex: 1 }} numberOfLines={1}>{g.title}</Txt>
                        </View>
                        {g.description ? <Txt size={13} color={c.textMuted} style={{ marginTop: 2 }}>{g.description}</Txt> : null}
                      </View>
                      <Pressable onPress={() => del.mutate(g.id)} hitSlop={10}><Trash size={18} color={c.textFaint} /></Pressable>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: c.surfaceAlt }}>
                        <Txt size={11} color={c.textMuted}>{g.horizon}</Txt>
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: c.surfaceAlt }}>
                        <Txt size={11} color={c.textMuted}>{g.category}</Txt>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 6 }}>
                      <Txt size={13} color={c.textMuted}>{Math.round(g.currentValue)} / {g.targetValue} {g.unit}</Txt>
                      <Txt weight="700" color={c.accent2}>{pct}%</Txt>
                    </View>
                    <ProgressBar value={pct} color={c.accent2} />
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                      <Pressable onPress={() => bump(g, -1)} style={{ flex: 1, height: 38, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                        <Minus size={16} color={c.text} weight="bold" /><Txt weight="600">{t("goals.progress")}</Txt>
                      </Pressable>
                      <Pressable onPress={() => bump(g, 1)} style={{ flex: 1, height: 38, borderRadius: 12, backgroundColor: c.accent2, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                        <Plus size={16} color="#fff" weight="bold" /><Text style={{ color: "#fff", fontWeight: "700" }}>{t("goals.progress")}</Text>
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </ScrollView>

        <Sheet visible={open} onClose={() => setOpen(false)} title={t("goals.newGoal")}>
          <Label>{t("goals.goalTitle")}</Label>
          <View style={{ height: 8 }} />
          <Input value={title} onChangeText={setTitle} placeholder={t("goals.titlePlaceholder")} />
          <View style={{ height: 16 }} />
          <Label>{t("goals.description")}</Label>
          <View style={{ height: 8 }} />
          <Input value={desc} onChangeText={setDesc} placeholder={t("goals.optional")} multiline />
          <View style={{ height: 16 }} />
          <Label>{t("goals.horizon")}</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {HORIZONS.map((h) => <Pill key={h} label={h} active={horizon === h} onPress={() => setHorizon(h)} />)}
          </View>
          <View style={{ height: 16 }} />
          <Label>{t("goals.category")}</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {CATEGORIES.map((h) => <Pill key={h} label={h} active={category === h} onPress={() => setCategory(h)} />)}
          </View>
          <View style={{ height: 16 }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>{t("goals.target")}</Label>
              <View style={{ height: 8 }} />
              <Input value={targetValue} onChangeText={setTargetValue} placeholder="100" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Label>{t("goals.unit")}</Label>
              <View style={{ height: 8 }} />
              <Input value={unit} onChangeText={setUnit} placeholder="%" />
            </View>
          </View>
          <View style={{ height: 24 }} />
          <Button title={t("goals.addGoal")} onPress={save} loading={add.isPending} />
        </Sheet>
      </SafeAreaView>
    </View>
  );
}

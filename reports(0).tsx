import { useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TrendUp, TrendDown, Wallet, CheckCircle, Target, Fire, MapPin, PathIcon } from "phosphor-react-native";
import { useTheme } from "../lib/theme";
import { useReport, useSettings } from "../lib/hooks";
import { Card, Txt, Label, Pill, ScreenHeader, StatTile } from "../components/ui";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";

const RANGES = ["daily", "weekly", "monthly", "yearly"];

export default function Reports() {
  const { c } = useTheme();
  const router = useRouter();
  const t = useT();
  const [range, setRange] = useState("weekly");
  const { data, isLoading } = useReport(range);
  const { data: settings } = useSettings();
  const currency = settings?.settings?.currency ?? "USD";

  const fin = data?.finance ?? { income: 0, expense: 0, savings: 0 };
  const prod = data?.productivity ?? { tasksDone: 0, goalsCompleted: 0, habitCheckins: 0, activeHabits: 0 };
  const travel = data?.travel ?? { points: 0, distanceKm: 0 };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("reports.title")} onBack={() => router.back()} />
        <View style={{ paddingHorizontal: 20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {RANGES.map((r) => <Pill key={r} label={r} active={range === r} onPress={() => setRange(r)} />)}
          </ScrollView>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Finance */}
          <Label>{t("reports.finance")}</Label>
          <View style={{ height: 10 }} />
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.accent2 + "22", alignItems: "center", justifyContent: "center" }}>
                  <TrendUp size={20} color={c.accent2} weight="bold" />
                </View>
                <View><Label>{t("reports.income")}</Label><Txt weight="800" size={18} color={c.accent2}>{money(fin.income, currency)}</Txt></View>
              </View>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.danger + "22", alignItems: "center", justifyContent: "center" }}>
                  <TrendDown size={20} color={c.danger} weight="bold" />
                </View>
                <View><Label>{t("reports.expense")}</Label><Txt weight="800" size={18} color={c.danger}>{money(fin.expense, currency)}</Txt></View>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: c.border, marginBottom: 14 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.accent + "22", alignItems: "center", justifyContent: "center" }}>
                <Wallet size={20} color={c.accent} weight="duotone" />
              </View>
              <View style={{ flex: 1 }}><Label>{t("reports.netSavings")}</Label>
                <Txt weight="800" size={20} color={fin.savings >= 0 ? c.accent2 : c.danger}>{money(fin.savings, currency)}</Txt>
              </View>
            </View>
          </Card>

          {/* Productivity */}
          <Label>{t("reports.productivity")}</Label>
          <View style={{ height: 10 }} />
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              <StatTile label={t("reports.tasksDone")} value={String(prod.tasksDone)} color={c.info} />
              <StatTile label={t("reports.goalsHit")} value={String(prod.goalsCompleted)} color={c.accent2} />
            </View>
            <View style={{ flexDirection: "row" }}>
              <StatTile label={t("reports.habitCheckins")} value={String(prod.habitCheckins)} color={c.warn} />
              <StatTile label={t("reports.activeHabits")} value={String(prod.activeHabits)} color={c.accent} />
            </View>
          </Card>

          {/* Travel */}
          <Label>{t("reports.travel")}</Label>
          <View style={{ height: 10 }} />
          <Card>
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.warn + "22", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={20} color={c.warn} weight="duotone" />
                </View>
                <View><Label>{t("reports.places")}</Label><Txt weight="800" size={18}>{travel.points}</Txt></View>
              </View>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.info + "22", alignItems: "center", justifyContent: "center" }}>
                  <PathIcon size={20} color={c.info} weight="duotone" />
                </View>
                <View><Label>{t("reports.distance")}</Label><Txt weight="800" size={18}>{travel.distanceKm} km</Txt></View>
              </View>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

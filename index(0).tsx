import { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  MagnifyingGlass, Gear, CheckCircle, CircleIcon, ArrowUpRight, ArrowDownRight,
  Sparkle, Clock, Target, Fire, CaretRight, Lightbulb, Warning, Bank, Storefront,
} from "phosphor-react-native";
import { useTheme } from "../../lib/theme";
import { useDashboard, useToggleReminder, useSettings, useMoneyAdvice, useMoneyPlan } from "../../lib/hooks";
import { scheduleDailyAdvice } from "../../lib/notify";
import { api as typedApi } from "../../lib/api";
const api: any = typedApi;
import { authClient } from "../../lib/auth";
import { Card, Txt, Label, ProgressBar, SectionHeader, IconButton, CardSkeleton, Skeleton, Sheet, Pill } from "../../components/ui";
import { ProgressRing } from "../../components/charts";
import { greeting, money, fmtTime, fmtTime24 } from "../../lib/format";
import { useT } from "../../lib/i18n";

export default function Dashboard() {
  const { c } = useTheme();
  const router = useRouter();
  const t = useT();
  const { data, isLoading, refetch } = useDashboard();
  const { data: settingsData } = useSettings();
  const { data: session } = authClient.useSession();
  const { data: adviceData } = useMoneyAdvice();
  const { data: planData } = useMoneyPlan();
  const toggle = useToggleReminder();
  const [insight, setInsight] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(false);

  const currency = settingsData?.settings?.currency ?? "TZS";
  const name = (session?.user?.name ?? "there").split(" ")[0];
  const advice = adviceData;
  const plan = planData?.plan;

  // Schedule the morning money-advice notification once.
  useEffect(() => { scheduleDailyAdvice(8, 0); }, []);

  const loadInsight = useCallback(async () => {
    setInsightLoading(true);
    try {
      const r = await (await api.ai.insight.$post()).json();
      setInsight(r.insight);
    } catch { /* noop */ }
    setInsightLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const d = data;
  const now = new Date();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.textMuted, fontSize: 14 }}>{t(now.getHours() < 12 ? "home.greetingMorning" : now.getHours() < 18 ? "home.greetingAfternoon" : "home.greetingEvening")},</Text>
              <Text style={{ color: c.text, fontSize: 28, fontWeight: "800" }}>{name} 👋</Text>
              <Text style={{ color: c.textFaint, fontSize: 13, marginTop: 2 }}>
                {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <IconButton onPress={() => router.push("/search")}><MagnifyingGlass size={20} color={c.text} /></IconButton>
              <IconButton onPress={() => router.push("/settings")}><Gear size={20} color={c.text} /></IconButton>
            </View>
          </View>

          {isLoading && !d ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 18, backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 14 }}>
                <Skeleton width={92} height={92} radius={46} />
                <View style={{ flex: 1, gap: 10 }}>
                  <Skeleton width="40%" height={12} />
                  <Skeleton width="70%" height={18} />
                  <Skeleton width="55%" height={13} />
                </View>
              </View>
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
              <CardSkeleton lines={3} />
            </>
          ) : (
          <>
          {/* Daily progress */}
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 14 }}>
            <ProgressRing progress={d?.progress ?? 0} size={92} thickness={10}>
              <Text style={{ color: c.text, fontSize: 22, fontWeight: "800" }}>{d?.progress ?? 0}%</Text>
            </ProgressRing>
            <View style={{ flex: 1 }}>
              <Label>{t("home.todayProgress")}</Label>
              <Text style={{ color: c.text, fontSize: 17, fontWeight: "700", marginTop: 4 }}>
                {(d?.progress ?? 0) >= 70 ? t("home.crushing") : (d?.progress ?? 0) >= 30 ? t("home.keepGoing") : t("home.getStarted")}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4 }}>
                {t("home.habitsTasksDone", { habits: d?.habits?.done ?? 0, total: d?.habits?.total ?? 0, tasks: d?.remDone ?? 0 })}
              </Text>
            </View>
          </Card>

          {/* Expenses > income alert */}
          {plan?.expensesOverIncome && (
            <Pressable onPress={() => router.push("/(tabs)/money")} style={{ marginBottom: 14, backgroundColor: c.danger + "1E", borderColor: c.danger + "55", borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Warning size={24} color={c.danger} weight="fill" />
              <View style={{ flex: 1 }}>
                <Txt weight="800" color={c.danger} size={14}>{t("home.pilotAlert")}</Txt>
                <Txt size={12} color={c.textMuted}>{t("home.spentVs", { spent: money(plan.spentThisMonth, currency), earned: money(plan.earnedThisMonth, currency) })}</Txt>
              </View>
              <CaretRight size={16} color={c.danger} />
            </Pressable>
          )}

          {/* Finance summary */}
          <Card onPress={() => router.push("/(tabs)/money")} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Label>{t("home.thisMonth")}</Label>
              <CaretRight size={16} color={c.textFaint} />
            </View>
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <ArrowUpRight size={14} color={c.accent2} weight="bold" />
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>{t("home.income")}</Text>
                </View>
                <Text style={{ color: c.accent2, fontSize: 19, fontWeight: "800", marginTop: 2 }}>{money(d?.finances?.earned ?? 0, currency)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <ArrowDownRight size={14} color={c.danger} weight="bold" />
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>{t("home.spent")}</Text>
                </View>
                <Text style={{ color: c.danger, fontSize: 19, fontWeight: "800", marginTop: 2 }}>{money(d?.finances?.spent ?? 0, currency)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>{t("home.net")}</Text>
                <Text style={{ color: (d?.finances?.net ?? 0) >= 0 ? c.text : c.danger, fontSize: 19, fontWeight: "800", marginTop: 2 }}>
                  {money(d?.finances?.net ?? 0, currency)}
                </Text>
              </View>
            </View>
          </Card>

          {/* AI insight */}
          <Card style={{ marginBottom: 14, backgroundColor: c.isDark ? "#1A1730" : "#F1EEFE", borderColor: c.accent + "55" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Sparkle size={18} color={c.accent} weight="fill" />
              <Text style={{ color: c.accent, fontWeight: "700", fontSize: 14 }}>{t("home.aiInsight")}</Text>
            </View>
            {insight ? (
              <Text style={{ color: c.text, fontSize: 14, lineHeight: 21 }}>{insight}</Text>
            ) : (
              <Pressable onPress={loadInsight}>
                <Text style={{ color: c.textMuted, fontSize: 14 }}>
                  {insightLoading ? t("home.thinking") : t("home.tapInsight")}
                </Text>
              </Pressable>
            )}
          </Card>

          {/* Daily money advice */}
          {advice?.advice ? (
            <Card onPress={() => setAdviceOpen(true)} style={{ marginBottom: 14, backgroundColor: c.isDark ? "#13261F" : "#E9FBF3", borderColor: c.accent2 + "55" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Lightbulb size={18} color={c.accent2} weight="fill" />
                <Text style={{ color: c.accent2, fontWeight: "700", fontSize: 14, flex: 1 }}>{t("home.moneyAdvice")}</Text>
                <CaretRight size={15} color={c.accent2} />
              </View>
              <Text style={{ color: c.text, fontSize: 14, lineHeight: 21 }}>{advice.advice}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8 }}>{t("home.tapBusiness")}</Text>
            </Card>
          ) : null}

          {/* Today's schedule */}
          <SectionHeader title={t("home.todaySchedule")} actionLabel={t("home.calendar")} onAction={() => router.push("/(tabs)/plan")} />
          {d?.schedule?.length ? (
            <View style={{ gap: 10, marginBottom: 20 }}>
              {d.schedule.map((s: any) => (
                <Card key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}>
                  <View style={{ width: 4, height: 38, borderRadius: 2, backgroundColor: s.color ?? c.accent }} />
                  <Clock size={18} color={c.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Txt weight="600">{s.title}</Txt>
                    <Txt size={12} color={c.textMuted}>{fmtTime24(s.startTime)} – {fmtTime24(s.endTime)}{s.location ? ` · ${s.location}` : ""}</Txt>
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <Card style={{ marginBottom: 20, alignItems: "center", paddingVertical: 22 }}>
              <Txt color={c.textMuted}>{t("home.nothingScheduled")}</Txt>
            </Card>
          )}

          {/* Reminders */}
          <SectionHeader title={t("home.tasksReminders")} actionLabel={t("home.seeAll")} onAction={() => router.push("/(tabs)/plan")} />
          {d?.reminders?.overdueCount ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.danger }} />
              <Text style={{ color: c.danger, fontSize: 13, fontWeight: "600" }}>{t("home.overdue", { count: d.reminders.overdueCount })}</Text>
            </View>
          ) : null}
          {d?.reminders?.items?.length ? (
            <View style={{ gap: 10, marginBottom: 20 }}>
              {d.reminders.items.map((r: any) => (
                <Card key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}>
                  <Pressable onPress={() => toggle.mutate(r.id)}>
                    {r.completed ? <CheckCircle size={24} color={c.accent2} weight="fill" /> : <CircleIcon size={24} color={c.textFaint} />}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Txt weight="500" style={r.completed ? { textDecorationLine: "line-through", color: c.textFaint } : undefined}>{r.title}</Txt>
                    {r.dueAt ? <Txt size={12} color={c.textMuted}>{fmtTime(r.dueAt)}</Txt> : null}
                  </View>
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: r.priority === "high" ? c.danger : r.priority === "medium" ? c.warn : c.textFaint,
                  }} />
                </Card>
              ))}
            </View>
          ) : (
            <Card style={{ marginBottom: 20, alignItems: "center", paddingVertical: 22 }}>
              <Txt color={c.textMuted}>{t("home.noTasks")}</Txt>
            </Card>
          )}

          {/* Goals */}
          {d?.goals?.length ? (
            <>
              <SectionHeader title={t("home.activeGoals")} actionLabel={t("home.seeAll")} onAction={() => router.push("/goals")} />
              <View style={{ gap: 10 }}>
                {d.goals.map((g: any) => {
                  const pct = Math.round((g.currentValue / g.targetValue) * 100);
                  return (
                    <Card key={g.id}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                          <Target size={18} color={c.accent} weight="duotone" />
                          <Txt weight="600" numberOfLines={1} style={{ flex: 1 }}>{g.title}</Txt>
                        </View>
                        <Txt weight="700" color={c.accent}>{pct}%</Txt>
                      </View>
                      <ProgressBar value={pct} />
                    </Card>
                  );
                })}
              </View>
            </>
          ) : null}
          </>
          )}
        </ScrollView>

        <Sheet visible={adviceOpen} onClose={() => setAdviceOpen(false)} title={t("home.adviceTitle")}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Card style={{ marginBottom: 16, backgroundColor: c.accent2 + "14", borderColor: c.accent2 + "44", borderWidth: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Lightbulb size={18} color={c.accent2} weight="fill" />
                <Text style={{ color: c.accent2, fontWeight: "700" }}>{t("home.todayTipLabel")}</Text>
              </View>
              <Text style={{ color: c.text, fontSize: 15, lineHeight: 23 }}>{advice?.advice}</Text>
            </Card>

            {advice?.businessIdeas?.length ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Storefront size={18} color={c.accent} weight="duotone" />
                  <Label>{t("home.businessesConsider")}</Label>
                </View>
                <View style={{ gap: 8, marginBottom: 18 }}>
                  {advice.businessIdeas.map((b: string, i: number) => (
                    <Card key={i} style={{ paddingVertical: 12 }}><Txt size={14}>{b}</Txt></Card>
                  ))}
                </View>
              </>
            ) : null}

            {advice?.lending ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Bank size={18} color={c.info} weight="duotone" />
                  <Label>{t("home.whereBorrow")}</Label>
                </View>
                <Card style={{ marginBottom: 10 }}>
                  <Txt size={13} color={c.textMuted} style={{ lineHeight: 20 }}>
                    BoT central rate {advice.lending.botRate}% · avg commercial lending ~{advice.lending.avgCommercial}% p.a. Your tier: {advice.lending.tier}.
                  </Txt>
                  <Txt size={13} style={{ marginTop: 8, lineHeight: 20 }}>{advice.lending.guidance}</Txt>
                </Card>
                <View style={{ gap: 8, marginBottom: 20 }}>
                  {advice.lending.picks.map((l: any, i: number) => (
                    <Card key={i} style={{ paddingVertical: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Txt weight="700">{l.name}</Txt>
                        <View style={{ backgroundColor: c.info + "22", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Txt size={11} weight="600" color={c.info}>{l.type}</Txt>
                        </View>
                      </View>
                      <Txt size={12} color={c.textMuted} style={{ marginTop: 4 }}>{t("home.rate")} {l.ratePa}</Txt>
                      <Txt size={12} color={c.textMuted} style={{ marginTop: 2 }}>{t("home.bestFor")} {l.bestFor}</Txt>
                    </Card>
                  ))}
                </View>
                <Txt size={11} color={c.textFaint} style={{ marginBottom: 10 }}>{t("home.ratesNote")}</Txt>
              </>
            ) : null}
          </ScrollView>
        </Sheet>
      </SafeAreaView>
    </View>
  );
}

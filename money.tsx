import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  Plus, TrendUp, TrendDown, Trash, Sparkle, ChartPie, X, Receipt, Warning, ChartBar, Camera, Image as ImageIcon, FileText,
} from "phosphor-react-native";
import { useTheme, CHART_COLORS } from "../../lib/theme";
import {
  useTransactions, useFinanceReport, useAddTransaction, useDeleteTransaction,
  useBudgets, useAddBudget, useDeleteBudget, useSettings, useMoneyPlan,
  uploadFile, readReceipt,
} from "../../lib/hooks";
import { fireOverBudgetAlert } from "../../lib/notify";
import { api as typedApi } from "../../lib/api";
const api: any = typedApi;
import {
  Card, Txt, Label, Button, Input, Pill, Sheet, SectionHeader, ProgressBar, EmptyState,
} from "../../components/ui";
import { DonutChart, Legend, MiniArea } from "../../components/charts";
import { money, fmtDate, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../../lib/format";
import { useT } from "../../lib/i18n";

export default function Money() {
  const { c } = useTheme();
  const tr = useT();
  const [tab, setTab] = useState<"overview" | "plan" | "transactions" | "budgets">("overview");
  const [period, setPeriod] = useState("monthly");
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const { data: txData } = useTransactions();
  const { data: report } = useFinanceReport(period);
  const { data: budgetData } = useBudgets();
  const { data: settingsData } = useSettings();
  const { data: planData } = useMoneyPlan();
  const del = useDeleteTransaction();
  const currency = settingsData?.settings?.currency ?? "TZS";

  const plan = planData?.plan;
  // Loud alert when expenses exceed income this month.
  useEffect(() => {
    if (plan?.expensesOverIncome) {
      fireOverBudgetAlert(tr("home.spentVs", { spent: money(plan.spentThisMonth, currency), earned: money(plan.earnedThisMonth, currency) }));
    }
  }, [plan?.expensesOverIncome, plan?.spentThisMonth, plan?.earnedThisMonth]);

  const transactions = txData?.transactions ?? [];
  const byCat = report?.byCategory ?? {};
  const catData = Object.entries(byCat).map(([label, value]) => ({ label, value: value as number })).sort((a, b) => b.value - a.value);

  async function runAnalysis() {
    setAnalysisOpen(true);
    setAnalyzing(true);
    try {
      const r = await (await api.ai["analyze-spending"].$post()).json();
      setAnalysis(r.analysis);
    } catch { setAnalysis(tr("money.analyzeFail")); }
    setAnalyzing(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ color: c.text, fontSize: 26, fontWeight: "800" }}>{tr("money.title")}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, marginBottom: 12 }} style={{ maxHeight: 44 }}>
          {(["overview", "plan", "transactions", "budgets"] as const).map((tk) => (
            <Pill key={tk} label={tr(("money." + (tk === "overview" ? "overview" : "tab." + tk)) as any)} active={tab === tk} onPress={() => setTab(tk)} />
          ))}
        </ScrollView>

        {/* Over-budget banner (expenses > income) */}
        {plan?.expensesOverIncome && (
          <Pressable onPress={() => setTab("plan")} style={{ marginHorizontal: 20, marginBottom: 10, backgroundColor: c.danger + "1E", borderColor: c.danger + "55", borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Warning size={22} color={c.danger} weight="fill" />
            <View style={{ flex: 1 }}>
              <Txt weight="800" color={c.danger} size={13}>{tr("money.overspendBanner")}</Txt>
              <Txt size={12} color={c.textMuted}>{tr("home.spentVs", { spent: money(plan.spentThisMonth, currency), earned: money(plan.earnedThisMonth, currency) })}</Txt>
            </View>
          </Pressable>
        )}

        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {tab === "overview" && (
            <>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {["daily", "monthly", "yearly"].map((p) => (
                  <Pill key={p} label={tr(("money." + p) as any)} active={period === p} onPress={() => setPeriod(p)} />
                ))}
              </View>

              <Card style={{ marginBottom: 14 }}>
                <Label>{tr("money.netBalance", { period: tr(("money." + period) as any) })}</Label>
                <Text style={{ color: (report?.net ?? 0) >= 0 ? c.text : c.danger, fontSize: 34, fontWeight: "800", marginTop: 6 }}>
                  {money(report?.net ?? 0, currency)}
                </Text>
                <View style={{ flexDirection: "row", gap: 20, marginTop: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <TrendUp size={18} color={c.accent2} weight="bold" />
                    <View>
                      <Text style={{ color: c.textMuted, fontSize: 11 }}>{tr("money.income")}</Text>
                      <Text style={{ color: c.accent2, fontSize: 16, fontWeight: "700" }}>{money(report?.income ?? 0, currency)}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <TrendDown size={18} color={c.danger} weight="bold" />
                    <View>
                      <Text style={{ color: c.textMuted, fontSize: 11 }}>{tr("money.expense")}</Text>
                      <Text style={{ color: c.danger, fontSize: 16, fontWeight: "700" }}>{money(report?.expense ?? 0, currency)}</Text>
                    </View>
                  </View>
                </View>
              </Card>

              <Card style={{ marginBottom: 14 }}>
                <Label>{tr("money.last30")}</Label>
                <View style={{ marginTop: 10 }}>
                  <MiniArea series={report?.series ?? []} />
                </View>
                <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 10, height: 3, backgroundColor: c.accent2 }} /><Text style={{ color: c.textMuted, fontSize: 12 }}>{tr("money.income")}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 10, height: 3, backgroundColor: c.danger }} /><Text style={{ color: c.textMuted, fontSize: 12 }}>{tr("money.expense")}</Text>
                  </View>
                </View>
              </Card>

              {catData.length > 0 && (
                <Card style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <Label>{tr("money.spendingByCat")}</Label>
                    <ChartPie size={18} color={c.textMuted} />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                    <DonutChart data={catData} size={130} />
                    <View style={{ flex: 1 }}>
                      <Legend data={catData.slice(0, 6)} />
                    </View>
                  </View>
                </Card>
              )}

              <Button title={tr("money.analyzeAI")} variant="soft" icon={<Sparkle size={18} color={c.accent} weight="fill" />} onPress={runAnalysis} />
            </>
          )}

          {tab === "plan" && <PlanView plan={plan} currency={currency} />}

          {tab === "transactions" && (
            <>
              {transactions.length === 0 ? (
                <EmptyState icon={<TrendUp size={40} color={c.textFaint} />} title={tr("money.noTransactions")} subtitle={tr("money.noTransactionsSub")} action={<Button title={tr("money.addTransaction")} small onPress={() => setAddOpen(true)} />} />
              ) : (
                <View style={{ gap: 10 }}>
                  {transactions.map((t: any) => (
                    <Card key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}>
                      <View style={{
                        width: 42, height: 42, borderRadius: 12,
                        backgroundColor: (t.type === "income" ? c.accent2 : c.danger) + "22",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {t.type === "income" ? <TrendUp size={20} color={c.accent2} /> : <TrendDown size={20} color={c.danger} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt weight="600">{t.category}</Txt>
                        <Txt size={12} color={c.textMuted}>{t.note || fmtDate(t.date)}</Txt>
                      </View>
                      <Text style={{ color: t.type === "income" ? c.accent2 : c.text, fontWeight: "800", fontSize: 16 }}>
                        {t.type === "income" ? "+" : "-"}{money(t.amount, currency)}
                      </Text>
                      <Pressable onPress={() => Alert.alert(tr("money.delete"), tr("money.deleteTx"), [
                        { text: tr("common.cancel") }, { text: tr("common.delete"), style: "destructive", onPress: () => del.mutate(t.id) },
                      ])}>
                        <Trash size={18} color={c.textFaint} />
                      </Pressable>
                    </Card>
                  ))}
                </View>
              )}
            </>
          )}

          {tab === "budgets" && <BudgetsView currency={currency} budgets={budgetData?.budgets ?? []} byCat={byCat} />}
        </ScrollView>

        {/* FAB speed-dial */}
        {fabOpen && (
          <>
            <Pressable onPress={() => setFabOpen(false)} style={{ position: "absolute", inset: 0 }} />
            <Pressable onPress={() => { setFabOpen(false); setScanOpen(true); }} style={{
              position: "absolute", right: 20, bottom: 156, flexDirection: "row", alignItems: "center", gap: 10,
            }}>
              <View style={{ backgroundColor: c.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}><Txt weight="700" size={13}>{tr("money.scanReceipt")}</Txt></View>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.accent2, alignItems: "center", justifyContent: "center" }}>
                <Receipt size={22} color="#fff" weight="fill" />
              </View>
            </Pressable>
            <Pressable onPress={() => { setFabOpen(false); setAddOpen(true); }} style={{
              position: "absolute", right: 20, bottom: 96, flexDirection: "row", alignItems: "center", gap: 10,
            }}>
              <View style={{ backgroundColor: c.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}><Txt weight="700" size={13}>{tr("money.addManually")}</Txt></View>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
                <Plus size={22} color="#fff" weight="bold" />
              </View>
            </Pressable>
          </>
        )}
        <Pressable onPress={() => setFabOpen((v) => !v)} style={{
          position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29,
          backgroundColor: c.accent, alignItems: "center", justifyContent: "center",
          shadowColor: c.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
        }}>
          {fabOpen ? <X size={26} color="#fff" weight="bold" /> : <Plus size={28} color="#fff" weight="bold" />}
        </Pressable>
      </SafeAreaView>

      <AddTransactionSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <ScanReceiptSheet open={scanOpen} onClose={() => setScanOpen(false)} currency={currency} />

      <Sheet visible={analysisOpen} onClose={() => setAnalysisOpen(false)} title={tr("money.aiAnalysisTitle")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Sparkle size={20} color={c.accent} weight="fill" />
          <Text style={{ color: c.textMuted }}>{analyzing ? tr("money.analyzing") : tr("money.poweredBy")}</Text>
        </View>
        <Text style={{ color: c.text, fontSize: 15, lineHeight: 24 }}>{analysis}</Text>
      </Sheet>
    </View>
  );
}

function AddTransactionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const tr = useT();
  const add = useAddTransaction();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState("");

  const cats = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function save() {
    if (!amount || isNaN(Number(amount))) return;
    add.mutate({ type, amount: Number(amount), category, note });
    setAmount(""); setNote(""); onClose();
  }

  return (
    <Sheet visible={open} onClose={onClose} title={tr("money.addTransactionTitle")}>
      <View style={{ flexDirection: "row", backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {(["expense", "income"] as const).map((t) => (
          <Pressable key={t} onPress={() => { setType(t); setCategory((t === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0]); }} style={{
            flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center",
            backgroundColor: type === t ? (t === "expense" ? c.danger : c.accent2) : "transparent",
          }}>
            <Text style={{ color: type === t ? "#fff" : c.textMuted, fontWeight: "700" }}>{tr(("money." + (t === "expense" ? "expenseTab" : "incomeTab")) as any)}</Text>
          </Pressable>
        ))}
      </View>
      <Label>{tr("money.amount")}</Label>
      <Input value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" style={{ marginTop: 6, marginBottom: 14 }} />
      <Label>{tr("money.category")}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
        {cats.map((cat) => <Pill key={cat} label={cat} active={category === cat} onPress={() => setCategory(cat)} />)}
      </ScrollView>
      <Label>{tr("money.noteOptional")}</Label>
      <Input value={note} onChangeText={setNote} placeholder={tr("money.whatFor")} style={{ marginTop: 6, marginBottom: 16 }} />
      <Button title={tr("money.saveTransaction")} onPress={save} loading={add.isPending} />
    </Sheet>
  );
}

function BudgetsView({ currency, budgets, byCat }: { currency: string; budgets: any[]; byCat: Record<string, number> }) {
  const { c } = useTheme();
  const tr = useT();
  const add = useAddBudget();
  const del = useDeleteBudget();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [limit, setLimit] = useState("");

  function save() {
    if (!limit || isNaN(Number(limit))) return;
    add.mutate({ category, limit: Number(limit) });
    setLimit(""); setOpen(false);
  }

  return (
    <View>
      {budgets.length === 0 ? (
        <EmptyState icon={<ChartPie size={40} color={c.textFaint} />} title={tr("money.noBudgets")} subtitle={tr("money.noBudgetsSub")} action={<Button title={tr("money.addBudget")} small onPress={() => setOpen(true)} />} />
      ) : (
        <View style={{ gap: 12 }}>
          {budgets.map((b: any) => {
            const spent = byCat[b.category] ?? 0;
            const pct = Math.round((spent / b.limit) * 100);
            const over = spent > b.limit;
            return (
              <Card key={b.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Txt weight="700">{b.category}</Txt>
                  <Pressable onPress={() => del.mutate(b.id)}><Trash size={16} color={c.textFaint} /></Pressable>
                </View>
                <ProgressBar value={pct} color={over ? c.danger : pct > 80 ? c.warn : c.accent2} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ color: over ? c.danger : c.textMuted, fontSize: 13 }}>{tr("money.ofAmount", { spent: money(spent, currency), limit: money(b.limit, currency) })}</Text>
                  <Text style={{ color: over ? c.danger : c.textMuted, fontSize: 13, fontWeight: "600" }}>{pct}%</Text>
                </View>
              </Card>
            );
          })}
          <Button title={tr("money.addBudget")} variant="soft" onPress={() => setOpen(true)} />
        </View>
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title={tr("money.newBudget")}>
        <Label>{tr("money.category")}</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
          {EXPENSE_CATEGORIES.map((cat) => <Pill key={cat} label={cat} active={category === cat} onPress={() => setCategory(cat)} />)}
        </ScrollView>
        <Label>{tr("money.monthlyLimit")}</Label>
        <Input value={limit} onChangeText={setLimit} placeholder="0.00" keyboardType="decimal-pad" style={{ marginTop: 6, marginBottom: 16 }} />
        <Button title={tr("money.saveBudget")} onPress={save} loading={add.isPending} />
      </Sheet>
    </View>
  );
}

function PlanView({ plan, currency }: { plan: any; currency: string }) {
  const { c } = useTheme();
  const tr = useT();
  if (!plan) return <CardSkeletonBlock />;
  const income = plan.monthlyIncome ?? 0;
  if (!income) {
    return (
      <EmptyState
        icon={<ChartBar size={40} color={c.textFaint} />}
        title={tr("money.setIncomeFirst")}
        subtitle={tr("money.setIncomeSub")}
      />
    );
  }
  const colors: Record<string, string> = { expenses: c.danger, savings: c.accent2, invest: c.info };
  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Label>{tr("money.ruleTitle")}</Label>
        <Text style={{ color: c.text, fontSize: 28, fontWeight: "800", marginTop: 6 }}>{money(income, currency)}</Text>
        <Txt size={12} color={c.textMuted}>{tr("money.incomeToAllocate")}</Txt>
      </Card>
      {plan.buckets.map((b: any) => {
        const pct = b.target > 0 ? Math.round((b.actual / b.target) * 100) : 0;
        const col = colors[b.key] ?? c.accent;
        return (
          <Card key={b.key}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
              <View>
                <Txt weight="800">{b.label}</Txt>
                <Txt size={12} color={c.textMuted}>{tr("money.targetSuffix", { pct: b.pct })}</Txt>
              </View>
              {b.over && <View style={{ backgroundColor: c.danger + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}><Txt size={11} weight="700" color={c.danger}>{tr("money.overBudget")}</Txt></View>}
            </View>
            <ProgressBar value={pct} color={b.over ? c.danger : col} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ color: b.over ? c.danger : c.textMuted, fontSize: 13 }}>{tr("money.ofAmount", { spent: money(b.actual, currency), limit: money(b.target, currency) })}</Text>
              <Text style={{ color: b.over ? c.danger : c.textMuted, fontSize: 13, fontWeight: "700" }}>{pct}%</Text>
            </View>
          </Card>
        );
      })}
      <Card style={{ backgroundColor: c.accent + "12", borderColor: c.accent + "33", borderWidth: 1 }}>
        <Txt size={13} color={c.textMuted} style={{ lineHeight: 20 }}>
          {tr("money.savingsTip")}
        </Txt>
      </Card>
    </View>
  );
}

function CardSkeletonBlock() {
  const { c } = useTheme();
  return (
    <View style={{ gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 96, borderRadius: 16, backgroundColor: c.surface }} />
      ))}
    </View>
  );
}

function ScanReceiptSheet({ open, onClose, currency }: { open: boolean; onClose: () => void; currency: string }) {
  const { c } = useTheme();
  const tr = useT();
  const add = useAddTransaction();
  const [stage, setStage] = useState<"pick" | "reading" | "confirm">("pick");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [receiptKey, setReceiptKey] = useState<string | null>(null);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [destination, setDestination] = useState<"expense" | "income" | "budget">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState("");
  const addBudget = useAddBudget();

  function reset() {
    setStage("pick"); setPreviewUri(null); setReceiptKey(null); setAmount(""); setNote(""); setDestination("expense"); setType("expense"); setCategory(EXPENSE_CATEGORIES[0]);
  }
  function close() { reset(); onClose(); }

  async function handleFile(uri: string, filename: string, contentType: string, preview?: string) {
    try {
      setStage("reading");
      setPreviewUri(preview ?? (contentType.startsWith("image") ? uri : null));
      const key = await uploadFile(uri, filename, contentType);
      setReceiptKey(key);
      const r: any = await readReceipt(key);
      if (r?.amount) setAmount(String(r.amount));
      if (r?.suggestedType === "income") { setType("income"); setDestination("income"); }
      if (r?.merchant) setNote(r.merchant);
      setStage("confirm");
    } catch {
      Alert.alert(tr("money.couldntRead"), tr("money.enterManually"));
      setStage("confirm");
    }
  }

  async function pickImage(useCamera: boolean) {
    const perm = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(tr("money.permNeeded"), tr("money.allowAccess")); return; }
    const res = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await handleFile(a.uri, a.fileName ?? `receipt-${Date.now()}.jpg`, a.mimeType ?? "image/jpeg", a.uri);
  }

  async function pickDoc() {
    const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await handleFile(a.uri, a.name, a.mimeType ?? "application/octet-stream");
  }

  function save() {
    const amt = Number(amount);
    if (!amt || isNaN(amt)) { Alert.alert(tr("money.amountNeeded"), tr("money.validAmount")); return; }
    if (destination === "budget") {
      addBudget.mutate({ category, limit: amt });
    } else {
      add.mutate({ type: destination, amount: amt, category, note, receiptUrl: receiptKey, source: "receipt" });
    }
    close();
  }

  const cats = destination === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Sheet visible={open} onClose={close} title={tr("money.scanTitle")}>
      {stage === "pick" && (
        <View style={{ gap: 12 }}>
          <Txt size={13} color={c.textMuted}>{tr("money.scanIntro")}</Txt>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <ScanOption icon={<Camera size={26} color={c.accent} weight="duotone" />} label={tr("money.camera")} onPress={() => pickImage(true)} />
            <ScanOption icon={<ImageIcon size={26} color={c.accent} weight="duotone" />} label={tr("money.gallery")} onPress={() => pickImage(false)} />
            <ScanOption icon={<FileText size={26} color={c.accent} weight="duotone" />} label={tr("money.document")} onPress={pickDoc} />
          </View>
        </View>
      )}

      {stage === "reading" && (
        <View style={{ alignItems: "center", paddingVertical: 30, gap: 14 }}>
          {previewUri && <Image source={{ uri: previewUri }} style={{ width: 120, height: 160, borderRadius: 12 }} resizeMode="cover" />}
          <ActivityIndicator color={c.accent} />
          <Txt color={c.textMuted}>{tr("money.readingAmount")}</Txt>
        </View>
      )}

      {stage === "confirm" && (
        <View>
          {previewUri && <Image source={{ uri: previewUri }} style={{ width: 90, height: 120, borderRadius: 10, alignSelf: "center", marginBottom: 14 }} resizeMode="cover" />}
          <Label>{tr("money.detectedAmount")}</Label>
          <Input value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" style={{ marginTop: 6, marginBottom: 14 }} />

          <Label>{tr("money.addThisAs")}</Label>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 14 }}>
            {(["expense", "income", "budget"] as const).map((d) => (
              <Pressable key={d} onPress={() => { setDestination(d); setCategory((d === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0]); }} style={{
                flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                backgroundColor: destination === d ? c.accent : c.surfaceAlt,
              }}>
                <Text style={{ color: destination === d ? "#fff" : c.textMuted, fontWeight: "700", fontSize: 13 }}>{tr(("money." + (d === "expense" ? "expenseTab" : d === "income" ? "incomeTab" : "budgetTab")) as any)}</Text>
              </Pressable>
            ))}
          </View>

          <Label>{tr("money.category")}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
            {cats.map((cat) => <Pill key={cat} label={cat} active={category === cat} onPress={() => setCategory(cat)} />)}
          </ScrollView>

          {destination !== "budget" && (
            <>
              <Label>{tr("money.note")}</Label>
              <Input value={note} onChangeText={setNote} placeholder={tr("money.merchantNote")} style={{ marginTop: 6, marginBottom: 16 }} />
            </>
          )}

          <Button title={destination === "budget" ? tr("money.setBudget") : tr("money.saveTransaction")} onPress={save} loading={add.isPending || addBudget.isPending} />
        </View>
      )}
    </Sheet>
  );
}

function ScanOption({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 14, paddingVertical: 18, alignItems: "center", gap: 8, opacity: pressed ? 0.7 : 1,
    })}>
      {icon}
      <Txt size={13} weight="600">{label}</Txt>
    </Pressable>
  );
}

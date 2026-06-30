import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Switch, Alert, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as ImagePicker from "expo-image-picker";
import {
  Moon, Sun, CurrencyDollar, Fingerprint, MapPin, Lock, SignOut, User, CaretRight, Camera, Wallet,
} from "phosphor-react-native";
import { useTheme } from "../lib/theme";
import { useI18n, LANGUAGES } from "../lib/i18n";
import { Translate } from "phosphor-react-native";
import { useSettings, useUpdateSettings, uploadFile, viewUrl } from "../lib/hooks";
import { authClient, clearToken } from "../lib/auth";
import { Card, Txt, Label, ScreenHeader, Pill, Input } from "../components/ui";
import { CURRENCY_SYMBOLS } from "../lib/format";

function Row({ icon, title, sub, right, onPress }: any) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, opacity: pressed && onPress ? 0.6 : 1,
    })}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Txt weight="600" size={15}>{title}</Txt>
        {sub ? <Txt size={12} color={c.textMuted}>{sub}</Txt> : null}
      </View>
      {right}
    </Pressable>
  );
}

export default function Settings() {
  const { c, theme, setTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const { data } = useSettings();
  const update = useUpdateSettings();
  const { data: session } = authClient.useSession();

  const s = data?.settings ?? {};
  const [currency, setCurrency] = useState(s.currency ?? "TZS");
  const [income, setIncome] = useState(String(s.monthlyIncome ?? ""));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (s.currency) setCurrency(s.currency); }, [s.currency]);
  useEffect(() => { if (s.monthlyIncome != null) setIncome(s.monthlyIncome ? String(s.monthlyIncome) : ""); }, [s.monthlyIncome]);
  useEffect(() => {
    let alive = true;
    if (s.profileImage) viewUrl(s.profileImage).then((u) => { if (alive) setAvatarUrl(u); }).catch(() => {});
    else setAvatarUrl(null);
    return () => { alive = false; };
  }, [s.profileImage]);

  function patch(p: any) { update.mutate({ ...p }); }

  async function pickAvatar() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert(t("settings.permNeeded"), t("settings.permPhoto")); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploading(true);
      const key = await uploadFile(asset.uri, asset.fileName ?? `avatar-${Date.now()}.jpg`, asset.mimeType ?? "image/jpeg");
      patch({ profileImage: key });
      setAvatarUrl(asset.uri);
    } catch {
      Alert.alert(t("settings.uploadFailed"), t("settings.uploadFailedMsg"));
    } finally {
      setUploading(false);
    }
  }

  function saveIncome() {
    const n = Number(income.replace(/[^0-9.]/g, "")) || 0;
    patch({ monthlyIncome: n });
  }

  async function toggleBiometric(val: boolean) {
    if (val) {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!has || !enrolled) {
        Alert.alert(t("settings.unavailable"), t("settings.noBiometric"));
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirm biometric unlock" });
      if (!res.success) return;
    }
    patch({ biometricEnabled: val });
  }

  function signOut() {
    Alert.alert(t("settings.signOut"), t("settings.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.signOut"), style: "destructive", onPress: async () => {
          try { await authClient.signOut(); } catch {}
          await clearToken();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("settings.title")} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Profile */}
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <Pressable onPress={pickAvatar} style={{ width: 64, height: 64 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accent + "22", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: 64, height: 64 }} />
                ) : (
                  <User size={30} color={c.accent} weight="duotone" />
                )}
              </View>
              <View style={{ position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.bg }}>
                {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={13} color="#fff" weight="fill" />}
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Txt weight="800" size={18}>{session?.user?.name ?? t("common.you")}</Txt>
              <Txt size={13} color={c.textMuted}>{session?.user?.email ?? ""}</Txt>
              <Txt size={12} color={c.accent} style={{ marginTop: 2 }}>{t("settings.changePhoto")}</Txt>
            </View>
          </Card>

          {/* Monthly income (for 70/20/10 + advice) */}
          <Label>{t("settings.monthlyIncome")}</Label>
          <Card style={{ marginTop: 10, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Wallet size={20} color={c.accent} weight="duotone" />
              <Txt weight="600" style={{ flex: 1 }}>{t("settings.incomeHint")}</Txt>
            </View>
            <Input value={income} onChangeText={setIncome} placeholder={t("settings.incomePlaceholder", { currency })} keyboardType="numeric" />
            <Pressable onPress={saveIncome} style={({ pressed }) => ({ marginTop: 10, alignSelf: "flex-start", backgroundColor: c.accent, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, opacity: pressed ? 0.7 : 1 })}>
              <Txt weight="700" color="#fff" size={13}>{t("settings.saveIncome")}</Txt>
            </Pressable>
          </Card>

          {/* Appearance */}
          <Label>{t("settings.appearance")}</Label>
          <Card style={{ marginTop: 10, marginBottom: 20 }}>
            <Row icon={theme === "dark" ? <Moon size={20} color={c.accent} weight="duotone" /> : <Sun size={20} color={c.warn} weight="duotone" />}
              title={t("settings.theme")} sub={t("settings.themeSub")}
              right={
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Pill label={t("settings.dark")} active={theme === "dark"} onPress={() => setTheme("dark")} />
                  <Pill label={t("settings.light")} active={theme === "light"} onPress={() => setTheme("light")} />
                </View>
              } />
          </Card>

          {/* Language */}
          <Label>{t("settings.language")}</Label>
          <Card style={{ marginTop: 10, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Translate size={20} color={c.accent2} weight="duotone" />
              <Txt weight="600">{t("settings.languageSub")}</Txt>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {LANGUAGES.map((l) => (
                <Pill key={l.code} label={l.native} active={lang === l.code} onPress={() => setLang(l.code)} />
              ))}
            </View>
          </Card>

          {/* Currency */}
          <Label>{t("settings.currency")}</Label>
          <Card style={{ marginTop: 10, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <CurrencyDollar size={20} color={c.accent2} weight="duotone" />
              <Txt weight="600">{t("settings.displayCurrency")}</Txt>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Object.keys(CURRENCY_SYMBOLS).map((cur) => (
                <Pill key={cur} label={`${cur} ${CURRENCY_SYMBOLS[cur]}`} active={currency === cur}
                  onPress={() => { setCurrency(cur); patch({ currency: cur }); }} />
              ))}
            </View>
          </Card>

          {/* Security */}
          <Label>{t("settings.security")}</Label>
          <Card style={{ marginTop: 10, marginBottom: 20 }}>
            <Row icon={<Lock size={20} color={c.info} weight="duotone" />} title={t("settings.pinLock")} sub={t("settings.pinSub")}
              right={<Switch value={!!s.pinEnabled} onValueChange={(v) => patch({ pinEnabled: v })} trackColor={{ true: c.accent }} />} />
            <View style={{ height: 1, backgroundColor: c.border }} />
            <Row icon={<Fingerprint size={20} color={c.accent} weight="duotone" />} title={t("settings.biometric")} sub={t("settings.biometricSub")}
              right={<Switch value={!!s.biometricEnabled} onValueChange={toggleBiometric} trackColor={{ true: c.accent }} />} />
            <View style={{ height: 1, backgroundColor: c.border }} />
            <Row icon={<MapPin size={20} color={c.warn} weight="duotone" />} title={t("settings.locationTracking")} sub={t("settings.locationSub")}
              right={<Switch value={!!s.locationTrackingEnabled} onValueChange={(v) => patch({ locationTrackingEnabled: v })} trackColor={{ true: c.accent }} />} />
          </Card>

          {/* Account */}
          <Card padded={false} style={{ marginBottom: 20 }}>
            <Pressable onPress={signOut} style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 14, padding: 16, opacity: pressed ? 0.6 : 1,
            })}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.danger + "22", alignItems: "center", justifyContent: "center" }}>
                <SignOut size={20} color={c.danger} weight="duotone" />
              </View>
              <Txt weight="700" color={c.danger} style={{ flex: 1 }}>{t("settings.signOut")}</Txt>
              <CaretRight size={16} color={c.textFaint} />
            </Pressable>
          </Card>

          <Text style={{ color: c.textFaint, fontSize: 12, textAlign: "center" }}>LifePilot AI · v1.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

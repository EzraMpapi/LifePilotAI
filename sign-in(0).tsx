import { useState } from "react";
import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Compass } from "phosphor-react-native";
import { useTheme } from "../../lib/theme";
import { authClient, captureToken } from "../../lib/auth";
import { Input, Button, Txt } from "../../components/ui";
import { useT } from "../../lib/i18n";

export default function SignIn() {
  const { c } = useTheme();
  const router = useRouter();
  const t = useT();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!email || !password || (mode === "up" && !name)) {
      setError(t("auth.fillFields"));
      return;
    }
    setLoading(true);
    try {
      if (mode === "up") {
        const { error: e } = await authClient.signUp.email(
          { name, email, password }, { onSuccess: captureToken }
        );
        if (e) throw new Error(e.message);
      } else {
        const { error: e } = await authClient.signIn.email(
          { email, password }, { onSuccess: captureToken }
        );
        if (e) throw new Error(e.message);
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? t("auth.wentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: "center", marginBottom: 32 }}>
              <View style={{
                width: 76, height: 76, borderRadius: 24, backgroundColor: c.accent,
                alignItems: "center", justifyContent: "center", marginBottom: 18,
              }}>
                <Compass size={42} color="#fff" weight="duotone" />
              </View>
              <Text style={{ color: c.text, fontSize: 30, fontWeight: "800" }}>LifePilot AI</Text>
              <Text style={{ color: c.textMuted, fontSize: 15, marginTop: 6, textAlign: "center" }}>
                {t("auth.tagline")}
              </Text>
            </View>

            <View style={{ flexDirection: "row", backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 4, marginBottom: 20 }}>
              {(["in", "up"] as const).map((m) => (
                <Pressable key={m} onPress={() => { setMode(m); setError(""); }} style={{
                  flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center",
                  backgroundColor: mode === m ? c.surface : "transparent",
                  borderWidth: mode === m ? 1 : 0, borderColor: c.border,
                }}>
                  <Text style={{ color: mode === m ? c.text : c.textMuted, fontWeight: "700" }}>
                    {m === "in" ? t("auth.signIn") : t("auth.signUp")}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ gap: 12 }}>
              {mode === "up" && (
                <Input value={name} onChangeText={setName} placeholder={t("auth.fullName")} />
              )}
              <Input value={email} onChangeText={setEmail} placeholder={t("auth.email")} keyboardType="email-address" />
              <Input value={password} onChangeText={setPassword} placeholder={t("auth.password")} secureTextEntry />
            </View>

            {error ? (
              <Text style={{ color: c.danger, marginTop: 12, fontSize: 14 }}>{error}</Text>
            ) : null}

            <Button
              title={mode === "in" ? t("auth.signIn") : t("auth.createAccount")}
              onPress={submit}
              loading={loading}
              style={{ marginTop: 20 }}
            />

            <Text style={{ color: c.textFaint, fontSize: 12, textAlign: "center", marginTop: 24, lineHeight: 18 }}>
              {t("auth.disclaimer")}
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

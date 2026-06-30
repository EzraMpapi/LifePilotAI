import { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Robot, PaperPlaneRight, Sparkle, Trash } from "phosphor-react-native";
import { useTheme } from "../../lib/theme";
import { api as typedApi } from "../../lib/api";
import { useT } from "../../lib/i18n";
const api: any = typedApi;

const QUICK_KEYS = ["ai.q1", "ai.q2", "ai.q3", "ai.q4", "ai.q5", "ai.q6"] as const;

type Msg = { role: string; content: string; id?: number | string };

export default function AI() {
  const { c } = useTheme();
  const t = useT();
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<Msg[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-history"],
    queryFn: async () => (await api.ai.history.$get()).json(),
  });

  useEffect(() => {
    if (data?.messages) setLocalMessages(data.messages as Msg[]);
  }, [data]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [localMessages, sending]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || sending) return;
    setInput("");
    setLocalMessages((p) => [...p, { role: "user", content: msg, id: `tmp-${Date.now()}` }]);
    setSending(true);
    try {
      const r = await (await api.ai.chat.$post({ json: { message: msg } })).json();
      setLocalMessages((p) => [...p, { role: "assistant", content: r.reply, id: r.message?.id }]);
    } catch {
      setLocalMessages((p) => [...p, { role: "assistant", content: t("ai.error") }]);
    } finally {
      setSending(false);
      qc.invalidateQueries({ queryKey: ["ai-history"] });
    }
  }

  async function clear() {
    await api.ai.clear.$post();
    setLocalMessages([]);
    qc.invalidateQueries({ queryKey: ["ai-history"] });
  }

  const empty = localMessages.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
            <Robot size={24} color="#fff" weight="duotone" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: "800" }}>LifePilot AI</Text>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>{t("ai.subtitle")}</Text>
          </View>
          {!empty && <Pressable onPress={clear}><Trash size={20} color={c.textFaint} /></Pressable>}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
            ) : empty ? (
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: c.accent + "22", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Sparkle size={38} color={c.accent} weight="fill" />
                </View>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: "700", marginBottom: 6 }}>{t("ai.askAnything")}</Text>
                <Text style={{ color: c.textMuted, fontSize: 14, textAlign: "center", maxWidth: 280, marginBottom: 24 }}>
                  {t("ai.intro")}
                </Text>
                <View style={{ gap: 10, width: "100%" }}>
                  {QUICK_KEYS.map((qk) => {
                    const q = t(qk);
                    return (
                    <Pressable key={qk} onPress={() => send(q)} style={{
                      backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border,
                      paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10,
                    }}>
                      <Sparkle size={16} color={c.accent} />
                      <Text style={{ color: c.text, fontSize: 14, fontWeight: "500" }}>{q}</Text>
                    </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              localMessages.map((m, i) => (
                <View key={m.id ?? i} style={{ marginBottom: 14, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <View style={{
                    maxWidth: "86%", borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16,
                    backgroundColor: m.role === "user" ? c.accent : c.surface,
                    borderWidth: m.role === "user" ? 0 : 1, borderColor: c.border,
                    borderBottomRightRadius: m.role === "user" ? 4 : 18,
                    borderBottomLeftRadius: m.role === "user" ? 18 : 4,
                  }}>
                    <Text style={{ color: m.role === "user" ? "#fff" : c.text, fontSize: 15, lineHeight: 22 }}>{m.content}</Text>
                  </View>
                </View>
              ))
            )}
            {sending && (
              <View style={{ alignItems: "flex-start", marginBottom: 14 }}>
                <View style={{ backgroundColor: c.surface, borderRadius: 18, borderBottomLeftRadius: 4, padding: 14, borderWidth: 1, borderColor: c.border, flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <ActivityIndicator color={c.accent} size="small" />
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>{t("ai.thinking")}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input bar */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: c.border }}>
            <TextInput
              value={input} onChangeText={setInput} placeholder={t("ai.placeholder")} placeholderTextColor={c.textFaint}
              multiline
              style={{
                flex: 1, maxHeight: 120, backgroundColor: c.surfaceAlt, borderRadius: 22, borderWidth: 1, borderColor: c.border,
                color: c.text, fontSize: 15, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
              }}
            />
            <Pressable onPress={() => send(input)} disabled={!input.trim() || sending} style={{
              width: 46, height: 46, borderRadius: 23, backgroundColor: input.trim() ? c.accent : c.surfaceAlt,
              alignItems: "center", justifyContent: "center",
            }}>
              <PaperPlaneRight size={22} color={input.trim() ? "#fff" : c.textFaint} weight="fill" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

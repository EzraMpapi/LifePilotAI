import { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  MagnifyingGlass, CaretRight, Wallet, BookOpen, NotePencil, Target, Bell, MapPin,
} from "phosphor-react-native";
import { useTheme } from "../lib/theme";
import { useSearch } from "../lib/hooks";
import { Card, Txt, ScreenHeader, EmptyState } from "../components/ui";
import { useT } from "../lib/i18n";

const TYPE_META: Record<string, { icon: any; color: string }> = {
  transaction: { icon: Wallet, color: "#22D3A6" },
  diary: { icon: BookOpen, color: "#6C5CE7" },
  note: { icon: NotePencil, color: "#3B9EFF" },
  goal: { icon: Target, color: "#22D3A6" },
  reminder: { icon: Bell, color: "#F59E0B" },
  location: { icon: MapPin, color: "#FF5C7C" },
};

export default function Search() {
  const { c } = useTheme();
  const router = useRouter();
  const t = useT();
  const [q, setQ] = useState("");
  const { data, isFetching } = useSearch(q);
  const results = (data?.results ?? []) as any[];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("search.title")} onBack={() => router.back()} />
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14 }}>
            <MagnifyingGlass size={18} color={c.textFaint} />
            <TextInput value={q} onChangeText={setQ} placeholder={t("search.placeholder")} placeholderTextColor={c.textFaint}
              autoFocus style={{ flex: 1, color: c.text, fontSize: 16, paddingVertical: 14 }} />
            {isFetching ? <ActivityIndicator color={c.accent} /> : null}
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {q.trim().length === 0 ? (
            <EmptyState icon={<MagnifyingGlass size={40} color={c.accent} weight="duotone" />}
              title={t("search.heading")} subtitle={t("search.sub")} />
          ) : results.length === 0 && !isFetching ? (
            <EmptyState icon={<MagnifyingGlass size={40} color={c.textFaint} weight="duotone" />}
              title={t("search.noResults")} subtitle={`"${q}"`} />
          ) : (
            <View style={{ gap: 10 }}>
              {results.map((r) => {
                const meta = TYPE_META[r.type] ?? { icon: MagnifyingGlass, color: c.accent };
                const Ic = meta.icon;
                return (
                  <Card key={`${r.type}-${r.id}`} onPress={() => router.push(r.route as any)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: meta.color + "22", alignItems: "center", justifyContent: "center" }}>
                      <Ic size={20} color={meta.color} weight="duotone" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt weight="700" size={15} numberOfLines={1}>{r.title}</Txt>
                      {r.sub ? <Txt size={13} color={c.textMuted} numberOfLines={1}>{r.sub}</Txt> : null}
                      <Text style={{ color: meta.color, fontSize: 11, fontWeight: "600", marginTop: 2, textTransform: "capitalize" }}>{r.type}</Text>
                    </View>
                    <CaretRight size={16} color={c.textFaint} />
                  </Card>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

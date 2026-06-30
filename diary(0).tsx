import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import { Plus, Trash, BookOpen } from "phosphor-react-native";
import { useTheme } from "../lib/theme";
import { useDiary, useAddDiary, useUpdateDiary, useDeleteDiary } from "../lib/hooks";
import { Card, Txt, Label, Button, Input, Sheet, EmptyState, ScreenHeader, IconButton } from "../components/ui";
import { MOODS, fmtDate } from "../lib/format";
import { useT } from "../lib/i18n";

function MoodIcon({ moodKey, size = 20 }: { moodKey?: string; size?: number }) {
  const m = MOODS.find((x) => x.key === moodKey);
  if (!m) return null;
  const Ic = (Icons as any)[m.icon] ?? Icons.Smiley;
  return <Ic size={size} color={m.color} weight="fill" />;
}

export default function Diary() {
  const { c } = useTheme();
  const router = useRouter();
  const t = useT();
  const { data } = useDiary();
  const add = useAddDiary();
  const update = useUpdateDiary();
  const del = useDeleteDiary();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("happy");
  const [tags, setTags] = useState("");

  const entries = data?.entries ?? [];

  function reset() {
    setEditId(null); setTitle(""); setContent(""); setMood("happy"); setTags("");
  }
  function openNew() { reset(); setOpen(true); }
  function openEdit(e: any) {
    setEditId(e.id); setTitle(e.title ?? ""); setContent(e.content ?? "");
    setMood(e.mood ?? "happy"); setTags(e.tags ?? ""); setOpen(true);
  }
  function save() {
    if (!content.trim() && !title.trim()) return;
    const payload = { title, content, mood, tags, date: new Date().toISOString() };
    if (editId) update.mutate({ id: editId, ...payload });
    else add.mutate(payload);
    setOpen(false); reset();
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("diary.title")} onBack={() => router.back()}
          right={<IconButton onPress={openNew}><Plus size={20} color={c.text} weight="bold" /></IconButton>} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {entries.length === 0 ? (
            <EmptyState icon={<BookOpen size={40} color={c.accent} weight="duotone" />}
              title={t("diary.noEntries")} subtitle={t("diary.noEntriesSub")}
              action={<Button title={t("diary.writeEntry")} onPress={openNew} small />} />
          ) : (
            <View style={{ gap: 12 }}>
              {entries.map((e: any) => (
                <Card key={e.id} onPress={() => openEdit(e)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <MoodIcon moodKey={e.mood} />
                    <Txt weight="700" size={16} style={{ flex: 1 }} numberOfLines={1}>{e.title || t("diary.untitled")}</Txt>
                    <Pressable onPress={() => del.mutate(e.id)} hitSlop={10}><Trash size={18} color={c.textFaint} /></Pressable>
                  </View>
                  <Txt size={13} color={c.textMuted} numberOfLines={3}>{e.content}</Txt>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <Txt size={12} color={c.textFaint}>{fmtDate(e.date)}</Txt>
                    {e.tags ? <Txt size={12} color={c.accent}>{e.tags.split(",").map((t: string) => `#${t.trim()}`).join(" ")}</Txt> : null}
                  </View>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>

        <Sheet visible={open} onClose={() => setOpen(false)} title={editId ? t("diary.editEntry") : t("diary.newEntry")}>
          <Label>{t("diary.entryTitle")}</Label>
          <View style={{ height: 8 }} />
          <Input value={title} onChangeText={setTitle} placeholder={t("diary.titlePlaceholder")} />
          <View style={{ height: 16 }} />
          <Label>{t("diary.howFeel")}</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {MOODS.map((m) => {
              const Ic = (Icons as any)[m.icon] ?? Icons.Smiley;
              const active = mood === m.key;
              return (
                <Pressable key={m.key} onPress={() => setMood(m.key)} style={{
                  width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center",
                  backgroundColor: active ? m.color + "33" : c.surfaceAlt, borderWidth: 1.5,
                  borderColor: active ? m.color : c.border,
                }}>
                  <Ic size={26} color={m.color} weight={active ? "fill" : "regular"} />
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: 16 }} />
          <Label>{t("diary.entry")}</Label>
          <View style={{ height: 8 }} />
          <Input value={content} onChangeText={setContent} placeholder={t("diary.whatHappened")} multiline />
          <View style={{ height: 16 }} />
          <Label>{t("diary.tagsLabel")}</Label>
          <View style={{ height: 8 }} />
          <Input value={tags} onChangeText={setTags} placeholder={t("diary.tagsPlaceholder")} />
          <View style={{ height: 24 }} />
          <Button title={editId ? t("diary.saveChanges") : t("diary.addEntry")} onPress={save} loading={add.isPending || update.isPending} />
        </Sheet>
      </SafeAreaView>
    </View>
  );
}

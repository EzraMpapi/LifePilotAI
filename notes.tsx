import { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Plus, Trash, NotePencil, Star, MagnifyingGlass } from "phosphor-react-native";
import { useTheme } from "../lib/theme";
import { useNotes, useAddNote, useUpdateNote, useFavoriteNote, useDeleteNote } from "../lib/hooks";
import { Card, Txt, Label, Button, Input, Pill, Sheet, EmptyState, ScreenHeader, IconButton } from "../components/ui";
import { relativeTime } from "../lib/format";
import { useT } from "../lib/i18n";

export default function Notes() {
  const { c } = useTheme();
  const router = useRouter();
  const t = useT();
  const { data } = useNotes();
  const add = useAddNote();
  const update = useUpdateNote();
  const fav = useFavoriteNote();
  const del = useDeleteNote();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folder, setFolder] = useState("General");
  const [tags, setTags] = useState("");
  const [query, setQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState("All");

  const notes = (data?.notes ?? []) as any[];
  const folders = useMemo<string[]>(() => ["All", ...Array.from(new Set(notes.map((n) => (n.folder as string) || "General")))], [notes]);
  const shown = notes.filter((n: any) => {
    if (activeFolder !== "All" && (n.folder || "General") !== activeFolder) return false;
    if (query && !(`${n.title} ${n.content}`.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  });

  function reset() { setEditId(null); setTitle(""); setContent(""); setFolder("General"); setTags(""); }
  function openNew() { reset(); setOpen(true); }
  function openEdit(n: any) {
    setEditId(n.id); setTitle(n.title ?? ""); setContent(n.content ?? "");
    setFolder(n.folder ?? "General"); setTags(n.tags ?? ""); setOpen(true);
  }
  function save() {
    if (!title.trim() && !content.trim()) return;
    const payload = { title: title || "Untitled", content, folder: folder || "General", tags };
    if (editId) update.mutate({ id: editId, ...payload });
    else add.mutate(payload);
    setOpen(false); reset();
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("notes.title")} onBack={() => router.back()}
          right={<IconButton onPress={openNew}><Plus size={20} color={c.text} weight="bold" /></IconButton>} />
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14 }}>
            <MagnifyingGlass size={18} color={c.textFaint} />
            <TextInput value={query} onChangeText={setQuery} placeholder={t("notes.searchNotes")} placeholderTextColor={c.textFaint}
              style={{ flex: 1, color: c.text, fontSize: 15, paddingVertical: 12 }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
            {folders.map((f) => <Pill key={f} label={f === "All" ? t("common.all") : f} active={activeFolder === f} onPress={() => setActiveFolder(f)} />)}
          </ScrollView>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {shown.length === 0 ? (
            <EmptyState icon={<NotePencil size={40} color={c.info} weight="duotone" />}
              title={t("notes.noNotes")} subtitle={t("notes.noNotesSub")}
              action={<Button title={t("notes.newNote")} onPress={openNew} small />} />
          ) : (
            <View style={{ gap: 12 }}>
              {shown.map((n: any) => (
                <Card key={n.id} onPress={() => openEdit(n)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Txt weight="700" size={16} style={{ flex: 1 }} numberOfLines={1}>{n.title}</Txt>
                    <Pressable onPress={() => fav.mutate(n.id)} hitSlop={10}>
                      <Star size={18} color={n.favorite ? c.warn : c.textFaint} weight={n.favorite ? "fill" : "regular"} />
                    </Pressable>
                    <Pressable onPress={() => del.mutate(n.id)} hitSlop={10}><Trash size={18} color={c.textFaint} /></Pressable>
                  </View>
                  <Txt size={13} color={c.textMuted} numberOfLines={3}>{n.content}</Txt>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: c.surfaceAlt }}>
                      <Txt size={11} color={c.textMuted}>{n.folder}</Txt>
                    </View>
                    {n.tags ? <Txt size={12} color={c.accent}>{n.tags.split(",").map((t: string) => `#${t.trim()}`).join(" ")}</Txt> : null}
                    <Txt size={11} color={c.textFaint} style={{ marginLeft: "auto" }}>{relativeTime(n.updatedAt ?? n.createdAt)}</Txt>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>

        <Sheet visible={open} onClose={() => setOpen(false)} title={editId ? t("notes.editNote") : t("notes.newNote")}>
          <Label>{t("notes.noteTitle")}</Label>
          <View style={{ height: 8 }} />
          <Input value={title} onChangeText={setTitle} placeholder={t("notes.titlePlaceholder")} />
          <View style={{ height: 16 }} />
          <Label>{t("notes.content")}</Label>
          <View style={{ height: 8 }} />
          <Input value={content} onChangeText={setContent} placeholder={t("notes.contentPlaceholder")} multiline />
          <View style={{ height: 16 }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>{t("notes.folder")}</Label>
              <View style={{ height: 8 }} />
              <Input value={folder} onChangeText={setFolder} placeholder={t("notes.general")} />
            </View>
            <View style={{ flex: 1 }}>
              <Label>{t("notes.tags")}</Label>
              <View style={{ height: 8 }} />
              <Input value={tags} onChangeText={setTags} placeholder={t("notes.tagsPlaceholder")} />
            </View>
          </View>
          <View style={{ height: 24 }} />
          <Button title={editId ? t("notes.saveChanges") : t("notes.addNote")} onPress={save} loading={add.isPending || update.isPending} />
        </Sheet>
      </SafeAreaView>
    </View>
  );
}

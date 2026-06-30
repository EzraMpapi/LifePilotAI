import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { MapPin, Trash, Star, Plus, Crosshair, MapTrifold } from "phosphor-react-native";
import { useTheme } from "../lib/theme";
import { useLocations, useAddLocation, useFavoriteLocation, useDeleteLocation, useClearLocations } from "../lib/hooks";
import { Card, Txt, Label, Button, EmptyState, ScreenHeader, IconButton, StatTile } from "../components/ui";
import { fmtDate, fmtTime } from "../lib/format";
import { useT } from "../lib/i18n";

function haversine(a: any, b: any) {
  const R = 6371, dLat = (b.latitude - a.latitude) * Math.PI / 180, dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function Timeline() {
  const { c } = useTheme();
  const router = useRouter();
  const t = useT();
  const { data } = useLocations();
  const add = useAddLocation();
  const fav = useFavoriteLocation();
  const del = useDeleteLocation();
  const clear = useClearLocations();
  const [capturing, setCapturing] = useState(false);
  const [tracking, setTracking] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastPt = useRef<{ latitude: number; longitude: number } | null>(null);

  const locs = (data?.locations ?? []) as any[];
  const sorted = [...locs].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  let distance = 0;
  const chron = [...locs].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  for (let i = 1; i < chron.length; i++) distance += haversine(chron[i - 1], chron[i]);
  const places = new Set(locs.map((l) => l.placeName ?? l.address ?? `${l.latitude},${l.longitude}`)).size;

  async function logCoords(latitude: number, longitude: number) {
    let address = "", placeName = "";
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo[0]) {
        const g = geo[0];
        placeName = g.name ?? g.street ?? g.city ?? "";
        address = [g.street, g.city, g.region, g.country].filter(Boolean).join(", ");
      }
    } catch {}
    add.mutate({ latitude, longitude, address, placeName, recordedAt: new Date().toISOString() });
    lastPt.current = { latitude, longitude };
  }

  async function capture() {
    setCapturing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("timeline.permNeeded"), t("timeline.enableRecord"));
        setCapturing(false); return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await logCoords(pos.coords.latitude, pos.coords.longitude);
    } catch (e) {
      Alert.alert(t("timeline.error"), t("timeline.couldntGet"));
    }
    setCapturing(false);
  }

  async function toggleTracking(val: boolean) {
    if (val) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("timeline.permNeeded"), t("timeline.enableAuto"));
        return;
      }
      setTracking(true);
      try {
        watchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 120 },
          (pos) => {
            const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            // only log if moved >100m from last logged point
            if (!lastPt.current || haversine(lastPt.current, p) > 0.1) {
              logCoords(p.latitude, p.longitude);
            }
          }
        );
      } catch {
        Alert.alert(t("timeline.error"), t("timeline.couldntStart"));
        setTracking(false);
      }
    } else {
      watchRef.current?.remove();
      watchRef.current = null;
      setTracking(false);
    }
  }

  useEffect(() => () => { watchRef.current?.remove(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("timeline.title")} onBack={() => router.back()}
          right={<IconButton onPress={() => locs.length && clear.mutate()}><Trash size={18} color={c.textFaint} /></IconButton>} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row" }}>
              <StatTile label={t("timeline.places")} value={String(places)} />
              <StatTile label={t("timeline.points")} value={String(locs.length)} />
              <StatTile label={t("timeline.distance")} value={`${Math.round(distance * 10) / 10} km`} color={c.accent} />
            </View>
          </Card>

          <Card style={{ marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accent + "22", alignItems: "center", justifyContent: "center" }}>
              <MapTrifold size={20} color={c.accent} weight="duotone" />
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="700">{t("timeline.autoTrack")}</Txt>
              <Txt size={12} color={c.textMuted}>{tracking ? t("timeline.recording") : t("timeline.logsPoint")}</Txt>
            </View>
            <Switch value={tracking} onValueChange={toggleTracking} trackColor={{ true: c.accent }} />
          </Card>

          <Button title={t("timeline.recordCurrent")} onPress={capture} loading={capturing}
            icon={<Crosshair size={18} color="#fff" weight="bold" />} style={{ marginBottom: 20 }} />

          {sorted.length === 0 ? (
            <EmptyState icon={<MapPin size={40} color={c.warn} weight="duotone" />}
              title={t("timeline.noLocations")} subtitle={t("timeline.noLocationsSub")} />
          ) : (
            <View>
              {sorted.map((l, idx) => (
                <View key={l.id} style={{ flexDirection: "row", gap: 14 }}>
                  <View style={{ alignItems: "center", width: 24 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: l.isFavorite ? c.warn : c.accent, marginTop: 18 }} />
                    {idx < sorted.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: c.border, marginVertical: 4 }} />}
                  </View>
                  <Card style={{ flex: 1, marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Txt weight="700" size={15} numberOfLines={1}>{l.placeName || l.address || t("timeline.unknownPlace")}</Txt>
                        {l.address && l.placeName ? <Txt size={12} color={c.textMuted} numberOfLines={1}>{l.address}</Txt> : null}
                        <Txt size={12} color={c.textFaint} style={{ marginTop: 4 }}>{fmtDate(l.recordedAt)} · {fmtTime(l.recordedAt)}</Txt>
                        <Txt size={11} color={c.textFaint} style={{ marginTop: 2 }}>{Number(l.latitude).toFixed(4)}, {Number(l.longitude).toFixed(4)}</Txt>
                      </View>
                      <Pressable onPress={() => fav.mutate(l.id)} hitSlop={8}>
                        <Star size={18} color={l.isFavorite ? c.warn : c.textFaint} weight={l.isFavorite ? "fill" : "regular"} />
                      </Pressable>
                      <Pressable onPress={() => del.mutate(l.id)} hitSlop={8}><Trash size={18} color={c.textFaint} /></Pressable>
                    </View>
                  </Card>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

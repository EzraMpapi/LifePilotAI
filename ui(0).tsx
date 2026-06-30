import React, { useEffect, useRef } from "react";
import {
  View, Text, Pressable, TextInput, ActivityIndicator, ViewStyle, TextStyle,
  StyleProp, ScrollView, Modal, Platform, Animated, DimensionValue,
} from "react-native";
import { useTheme } from "../lib/theme";
import * as Haptics from "expo-haptics";
import { CaretLeft as CaretLeftIcon } from "phosphor-react-native";

export function Skeleton({ width = "100%", height = 16, radius = 8, style }: {
  width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: c.surfaceAlt, opacity }, style]} />
  );
}

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12, marginBottom: 14 }}>
      <Skeleton width="45%" height={12} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? "70%" : "100%"} height={16} />
      ))}
    </View>
  );
}

export function Card({ children, style, onPress, padded = true }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean;
}) {
  const { c } = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border,
    padding: padded ? 16 : 0,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Txt({ children, size = 15, weight = "400", color, style, numberOfLines }: {
  children: React.ReactNode; size?: number; weight?: TextStyle["fontWeight"];
  color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  const { c } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[{ color: color ?? c.text, fontSize: size, fontWeight: weight }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return (
    <Text style={[{ color: c.textMuted, fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" }, style]}>
      {children}
    </Text>
  );
}

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, style, small }: {
  title: string; onPress: () => void; variant?: "primary" | "ghost" | "danger" | "soft";
  loading?: boolean; disabled?: boolean; icon?: React.ReactNode; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const { c } = useTheme();
  const bg = variant === "primary" ? c.accent : variant === "danger" ? c.danger : variant === "soft" ? c.surfaceAlt : "transparent";
  const fg = variant === "ghost" ? c.accent : variant === "soft" ? c.text : "#fff";
  return (
    <Pressable
      onPress={() => { if (!disabled && !loading) { Haptics.selectionAsync().catch(() => {}); onPress(); } }}
      disabled={disabled || loading}
      style={({ pressed }) => [{
        height: small ? 40 : 52, borderRadius: 14, backgroundColor: bg,
        alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
        paddingHorizontal: small ? 14 : 20,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        borderWidth: variant === "ghost" ? 1 : 0, borderColor: c.accent,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon}
          <Text style={{ color: fg, fontWeight: "700", fontSize: small ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ value, onChangeText, placeholder, multiline, keyboardType, style, secureTextEntry, autoFocus }: {
  value: string; onChangeText: (t: string) => void; placeholder?: string; multiline?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "decimal-pad"; style?: StyleProp<TextStyle>;
  secureTextEntry?: boolean; autoFocus?: boolean;
}) {
  const { c } = useTheme();
  return (
    <TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.textFaint}
      multiline={multiline} keyboardType={keyboardType} secureTextEntry={secureTextEntry} autoFocus={autoFocus}
      autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
      style={[{
        backgroundColor: c.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: c.border,
        color: c.text, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14,
        minHeight: multiline ? 100 : 52, textAlignVertical: multiline ? "top" : "center",
      }, style]}
    />
  );
}

export function Pill({ label, active, onPress, color }: {
  label: string; active?: boolean; onPress?: () => void; color?: string;
}) {
  const { c } = useTheme();
  const activeColor = color ?? c.accent;
  return (
    <Pressable onPress={onPress} style={{
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
      backgroundColor: active ? activeColor : c.surfaceAlt,
      borderWidth: 1, borderColor: active ? activeColor : c.border,
    }}>
      <Text style={{ color: active ? "#fff" : c.textMuted, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color, height = 8, track }: {
  value: number; color?: string; height?: number; track?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: track ?? c.surfaceAlt, overflow: "hidden" }}>
      <View style={{ height, width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color ?? c.accent, borderRadius: 999 }} />
    </View>
  );
}

export function EmptyState({ icon, title, subtitle, action }: {
  icon?: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 }}>
      {icon}
      <Text style={{ color: c.text, fontSize: 16, fontWeight: "700" }}>{title}</Text>
      {subtitle ? <Text style={{ color: c.textMuted, fontSize: 14, textAlign: "center", maxWidth: 260 }}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction }: {
  title: string; actionLabel?: string; onAction?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <Text style={{ color: c.text, fontSize: 18, fontWeight: "700" }}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction}><Text style={{ color: c.accent, fontWeight: "600", fontSize: 14 }}>{actionLabel}</Text></Pressable>
      ) : null}
    </View>
  );
}

export function IconButton({ children, onPress, bg }: { children: React.ReactNode; onPress?: () => void; bg?: string }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      width: 42, height: 42, borderRadius: 21, backgroundColor: bg ?? c.surfaceAlt,
      alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1,
      borderWidth: 1, borderColor: c.border,
    })}>
      {children}
    </Pressable>
  );
}

export function Sheet({ visible, onClose, children, title }: {
  visible: boolean; onClose: () => void; children: React.ReactNode; title?: string;
}) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 34 : 20, maxHeight: "92%",
            borderWidth: 1, borderColor: c.border,
          }}
        >
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: "center", marginBottom: 12 }} />
          {title ? <Text style={{ color: c.text, fontSize: 20, fontWeight: "700", paddingHorizontal: 20, marginBottom: 12 }}>{title}</Text> : null}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ScreenHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 }}>
      <Pressable onPress={onBack} style={({ pressed }) => ({
        width: 42, height: 42, borderRadius: 21, backgroundColor: c.surfaceAlt,
        alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1,
        borderWidth: 1, borderColor: c.border,
      })}>
        <CaretLeftIcon size={20} color={c.text} weight="bold" />
      </Pressable>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: "800", flex: 1 }} numberOfLines={1}>{title}</Text>
      {right}
    </View>
  );
}

export function StatTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      <Text style={{ color: color ?? c.text, fontSize: 22, fontWeight: "800", marginTop: 4 }}>{value}</Text>
      {sub ? <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

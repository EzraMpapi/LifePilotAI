import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Circle, G, Path } from "react-native-svg";
import { useTheme, CHART_COLORS } from "../lib/theme";

export function BarChart({ data, height = 160, color }: {
  data: { label: string; value: number }[]; height?: number; color?: string;
}) {
  const { c } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / data.length;
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 24);
          return (
            <Rect
              key={i} x={i * barW + barW * 0.2} y={height - h - 4}
              width={barW * 0.6} height={Math.max(2, h)} rx={2}
              fill={color ?? c.accent} opacity={d.value === 0 ? 0.25 : 1}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", color: c.textFaint, fontSize: 9 }} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// Dual line/area for income vs expense over time
export function MiniArea({ series, height = 120 }: {
  series: { date: string; income: number; expense: number }[]; height?: number;
}) {
  const { c } = useTheme();
  const w = 300;
  const max = Math.max(1, ...series.map((s) => Math.max(s.income, s.expense)));
  const step = w / Math.max(1, series.length - 1);
  const toPath = (key: "income" | "expense") => {
    return series.map((s, i) => {
      const x = i * step;
      const y = height - 10 - (s[key] / max) * (height - 20);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  };
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <Path d={toPath("expense")} stroke={c.danger} strokeWidth={2.5} fill="none" />
      <Path d={toPath("income")} stroke={c.accent2} strokeWidth={2.5} fill="none" />
    </Svg>
  );
}

export function DonutChart({ data, size = 160, thickness = 26 }: {
  data: { label: string; value: number }[]; size?: number; thickness?: number;
}) {
  const { c } = useTheme();
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  if (total === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r} stroke={c.surfaceAlt} strokeWidth={thickness} fill="none" />
        </Svg>
      </View>
    );
  }
  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${cx}, ${cy}`}>
        <Circle cx={cx} cy={cy} r={r} stroke={c.surfaceAlt} strokeWidth={thickness} fill="none" />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circ;
          const el = (
            <Circle
              key={i} cx={cx} cy={cy} r={r}
              stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={thickness} fill="none"
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </G>
    </Svg>
  );
}

export function Legend({ data }: { data: { label: string; value: number }[] }) {
  const { c } = useTheme();
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <View style={{ gap: 8 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
          <Text style={{ color: c.text, fontSize: 13, flex: 1 }} numberOfLines={1}>{d.label}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>{Math.round((d.value / total) * 100)}%</Text>
        </View>
      ))}
    </View>
  );
}

export function ProgressRing({ progress, size = 120, thickness = 12, color, children }: {
  progress: number; size?: number; thickness?: number; color?: string; children?: React.ReactNode;
}) {
  const { c } = useTheme();
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, progress)) / 100) * circ;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          <Circle cx={cx} cy={cy} r={r} stroke={c.surfaceAlt} strokeWidth={thickness} fill="none" />
          <Circle cx={cx} cy={cy} r={r} stroke={color ?? c.accent} strokeWidth={thickness} fill="none"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </G>
      </Svg>
      {children}
    </View>
  );
}

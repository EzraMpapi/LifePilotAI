import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useColorScheme } from "react-native";
import { storage } from "./storage";

export type ThemeName = "dark" | "light";

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accent2: string;
  warn: string;
  danger: string;
  info: string;
  isDark: boolean;
};

const dark: Palette = {
  bg: "#0B0E14",
  surface: "#151A23",
  surfaceAlt: "#1C2330",
  border: "#252D3B",
  text: "#EAF0F7",
  textMuted: "#8A95A6",
  textFaint: "#5A6576",
  accent: "#6C5CE7",
  accent2: "#22D3A6",
  warn: "#F59E0B",
  danger: "#FF5C7C",
  info: "#3B9EFF",
  isDark: true,
};

const light: Palette = {
  bg: "#F6F8FB",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF2F7",
  border: "#E2E8F0",
  text: "#0B0E14",
  textMuted: "#5A6576",
  textFaint: "#94A3B8",
  accent: "#6C5CE7",
  accent2: "#14B891",
  warn: "#D97706",
  danger: "#E11D6B",
  info: "#2563EB",
  isDark: false,
};

export const CHART_COLORS = [
  "#6C5CE7", "#22D3A6", "#3B9EFF", "#F59E0B", "#FF5C7C",
  "#A78BFA", "#2DD4BF", "#FB7185", "#FBBF24", "#60A5FA",
];

type Ctx = {
  theme: ThemeName;
  setTheme: (t: ThemeName | "system") => void;
  toggle: () => void;
  c: Palette;
};

const ThemeContext = createContext<Ctx>({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
  c: dark,
});

const STORAGE_KEY = "lp_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPref] = useState<ThemeName | "system">("dark");

  useEffect(() => {
    storage.getItem(STORAGE_KEY).then((v) => {
      if (v === "dark" || v === "light" || v === "system") setPref(v);
    });
  }, []);

  const resolved: ThemeName = pref === "system" ? (system === "light" ? "light" : "dark") : pref;

  const setTheme = useCallback((t: ThemeName | "system") => {
    setPref(t);
    storage.setItem(STORAGE_KEY, t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme: resolved, setTheme, toggle, c: resolved === "dark" ? dark : light }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

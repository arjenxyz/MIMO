"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  toggleTheme as toggleThemeMode,
  type ThemeMode,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const initial = resolveTheme(getStoredTheme());
    applyTheme(initial);
    setThemeState(initial);

    function onTheme(event: Event) {
      const detail = (event as CustomEvent<ThemeMode>).detail;
      if (detail === "light" || detail === "dark") setThemeState(detail);
    }
    window.addEventListener("mimo-theme", onTheme);
    return () => window.removeEventListener("mimo-theme", onTheme);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    applyTheme(mode);
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = toggleThemeMode();
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

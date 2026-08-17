"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
export type ThemePreference = Theme | "system";

interface ThemeContextType {
  theme: Theme;
  preference: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [theme, setResolvedTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("app-theme") as ThemePreference | null;
    const frame = requestAnimationFrame(() => {
      if (saved === "light" || saved === "dark" || saved === "system") setPreference(saved);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved: Theme = preference === "system" ? (media.matches ? "dark" : "light") : preference;
      setResolvedTheme(resolved);
      const root = document.documentElement;
      root.classList.toggle("dark", resolved === "dark");
      root.dataset.theme = resolved;
    };
    apply(); media.addEventListener("change", apply);
    localStorage.setItem("app-theme", preference);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  const setTheme = (value: ThemePreference) => setPreference(value);
  const toggleTheme = () => setPreference(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, preference, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

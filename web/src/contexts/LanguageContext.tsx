"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

type Language = "en" | "es";
type Dictionary = Record<string, string>;

const dictionaries: Record<Language, Dictionary> = {
  en: en as Dictionary,
  es: es as Dictionary,
};

interface LanguageContextType {
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("es"); // Default to spanish as requested by original repo structure

  useEffect(() => {
    const savedLang = localStorage.getItem("app-lang") as Language | null;
    if (savedLang) {
      const frame = window.requestAnimationFrame(() => setLangState(savedLang));
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("app-lang", newLang);
  };

  const t = (key: string): string => {
    const value = dictionaries[lang][key];
    if (value === undefined) {
      console.warn(`Translation key missing: ${key}`);
      return key; // Fallback to key itself
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

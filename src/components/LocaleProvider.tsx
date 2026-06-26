"use client";

import {
  DESKTOP_LOCALE_KEY,
  normalizeDesktopLocale,
  type DesktopLocale,
} from "@/lib/desktop-i18n";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type LocaleContextValue = {
  locale: DesktopLocale;
  setLocale: (locale: DesktopLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<DesktopLocale>("zh");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DESKTOP_LOCALE_KEY);
      setLocaleState(normalizeDesktopLocale(stored));
    } catch {
      setLocaleState("zh");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  }, [locale, ready]);

  const setLocale = useCallback((next: DesktopLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(DESKTOP_LOCALE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
    }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

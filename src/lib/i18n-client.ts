"use client";

import { createContext, useContext } from "react";
import {
  dictionaries,
  localeCookieName,
  localeMeta,
  normalizeLocale,
  supportedLocales,
  translate,
  type Dictionary,
  type Locale,
} from "@/lib/i18n-shared";

interface I18nContextValue {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function persistLocale(locale: Locale) {
  const days = 60 * 60 * 24 * 365;
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=${days}; SameSite=Lax`;
  window.localStorage.setItem(localeCookieName, locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = localeMeta[locale].dir;
}

export function detectClientLocale() {
  try {
    return normalizeLocale(
      window.localStorage.getItem(localeCookieName) ??
        document.cookie
          .split("; ")
          .find((part) => part.startsWith(`${localeCookieName}=`))
          ?.split("=")[1] ??
        window.navigator.languages?.[0] ??
        window.navigator.language,
    );
  } catch {
    return "en" as Locale;
  }
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: "en" as Locale,
      dictionary: dictionaries.en,
      setLocale: () => undefined,
      t: (key: string, values?: Record<string, string | number>) => translate(dictionaries.en, key, values),
    };
  }
  return context;
}

export { dictionaries, localeMeta, supportedLocales, translate, type Locale };

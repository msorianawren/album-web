export type AppLocale = "en" | "vi" | "zh" | "ja" | "ko" | "th" | "id" | "fr" | "de" | "es";
export type DictionarySection = Record<string, string | undefined>;
export type AppDictionary = Partial<Record<string, DictionarySection>>;

export const LOCALES: Record<AppLocale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  th: "ไทย",
  id: "Bahasa Indonesia",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

export const DEFAULT_LOCALE: AppLocale = "en";

export function getStoredLocale(): AppLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem("album-locale") as AppLocale;
    if (stored && LOCALES[stored]) return stored;
  } catch (e) {
    // Ignore error
  }
  return DEFAULT_LOCALE;
}

export function setStoredLocale(locale: AppLocale) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("album-locale", locale);
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (e) {
    // Ignore error
  }
}

export function getServerLocale() {
  try {
    // We can't import cookies directly in this shared file without causing issues in client components,
    // so we'll fetch it in server components directly from next/headers.
  } catch (e) {}
  return DEFAULT_LOCALE;
}

import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";

export const SUPPORTED_ASSISTANT_LOCALES = [
  "en",
  "vi",
  "zh-CN",
  "ja",
  "ko",
  "th",
  "id",
  "fr",
  "de",
  "es",
] as const;

export type AssistantLocale = (typeof SUPPORTED_ASSISTANT_LOCALES)[number];

export const DEFAULT_ASSISTANT_LOCALE: AssistantLocale = "en";

const localeAliases: Record<string, AssistantLocale> = {
  en: "en",
  english: "en",
  vi: "vi",
  "vi-vn": "vi",
  "tieng viet": "vi",
  "tiếng việt": "vi",
  zh: "zh-CN",
  "zh-cn": "zh-CN",
  "zh-hans": "zh-CN",
  "zh-sg": "zh-CN",
  chinese: "zh-CN",
  "中文": "zh-CN",
  ja: "ja",
  jp: "ja",
  "ja-jp": "ja",
  japanese: "ja",
  "日本語": "ja",
  ko: "ko",
  kr: "ko",
  "ko-kr": "ko",
  korean: "ko",
  "한국어": "ko",
  th: "th",
  "th-th": "th",
  thai: "th",
  "ไทย": "th",
  id: "id",
  in: "id",
  "id-id": "id",
  indonesia: "id",
  "bahasa indonesia": "id",
  fr: "fr",
  "fr-fr": "fr",
  "fr-ca": "fr",
  french: "fr",
  "français": "fr",
  de: "de",
  "de-de": "de",
  german: "de",
  deutsch: "de",
  es: "es",
  "es-es": "es",
  "es-mx": "es",
  spanish: "es",
  "español": "es",
};

function normalizeLocaleKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function isSupportedAssistantLocale(locale: unknown): locale is AssistantLocale {
  return SUPPORTED_ASSISTANT_LOCALES.includes(locale as AssistantLocale);
}

export function normalizeAssistantLocale(input: unknown): AssistantLocale {
  if (typeof input !== "string" || !input.trim()) return DEFAULT_ASSISTANT_LOCALE;
  if (isSupportedAssistantLocale(input)) return input;

  const normalized = normalizeLocaleKey(input);
  return localeAliases[normalized] ?? DEFAULT_ASSISTANT_LOCALE;
}

export function resolveAssistantLocaleFromSiteLanguage(siteLanguage: unknown): AssistantLocale {
  if (typeof siteLanguage === "string" && siteLanguage in LOCALES) {
    return siteLanguage === "zh" ? "zh-CN" : normalizeAssistantLocale(siteLanguage);
  }
  return normalizeAssistantLocale(siteLanguage);
}

export function readSelectedAssistantLocale(): AssistantLocale {
  if (typeof window === "undefined") return resolveAssistantLocaleFromSiteLanguage(DEFAULT_LOCALE);

  try {
    const stored = window.localStorage.getItem("album-locale");
    if (stored) return resolveAssistantLocaleFromSiteLanguage(stored);
  } catch {
    // Explicit language storage can be unavailable in private browsing.
  }

  const cookieLocale = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("NEXT_LOCALE="))
    ?.split("=")[1];
  if (cookieLocale) return resolveAssistantLocaleFromSiteLanguage(decodeURIComponent(cookieLocale));

  return normalizeAssistantLocale(window.navigator?.language);
}

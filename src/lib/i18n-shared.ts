import ar from "@/locales/ar.json";
import bn from "@/locales/bn.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import hi from "@/locales/hi.json";
import id from "@/locales/id.json";
import pt from "@/locales/pt.json";
import vi from "@/locales/vi.json";
import zhCN from "@/locales/zh-CN.json";

export const localeCookieName = "album-locale";

export const supportedLocales = ["en", "vi", "zh-CN", "hi", "es", "ar", "fr", "bn", "pt", "id"] as const;
export type Locale = (typeof supportedLocales)[number];
export type Dictionary = typeof en;

export const localeMeta: Record<Locale, { nativeName: string; dir: "ltr" | "rtl" }> = {
  en: { nativeName: "English", dir: "ltr" },
  vi: { nativeName: "Tiếng Việt", dir: "ltr" },
  "zh-CN": { nativeName: "简体中文", dir: "ltr" },
  hi: { nativeName: "हिन्दी", dir: "ltr" },
  es: { nativeName: "Español", dir: "ltr" },
  ar: { nativeName: "العربية", dir: "rtl" },
  fr: { nativeName: "Français", dir: "ltr" },
  bn: { nativeName: "বাংলা", dir: "ltr" },
  pt: { nativeName: "Português", dir: "ltr" },
  id: { nativeName: "Bahasa Indonesia", dir: "ltr" },
};

export const dictionaries: Record<Locale, Dictionary> = { en, vi, "zh-CN": zhCN, hi, es, ar, fr, bn, pt, id };

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return "en";
  const normalized = value.trim();
  if (supportedLocales.some((locale) => locale === normalized)) return normalized as Locale;
  const lower = normalized.toLowerCase();
  if (lower.startsWith("zh")) return "zh-CN";
  if (lower.startsWith("vi")) return "vi";
  if (lower.startsWith("hi")) return "hi";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("ar")) return "ar";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("bn")) return "bn";
  if (lower.startsWith("pt")) return "pt";
  if (lower.startsWith("id")) return "id";
  return "en";
}

function readPath(source: unknown, key: string) {
  return key.split(".").reduce<unknown>((value, part) => {
    if (value && typeof value === "object" && part in value) return (value as Record<string, unknown>)[part];
    return undefined;
  }, source);
}

export function translate(dictionary: Dictionary, key: string, values?: Record<string, string | number>) {
  const value = readPath(dictionary, key) ?? readPath(dictionaries.en, key);
  const text = typeof value === "string" ? value : key;
  return values
    ? Object.entries(values).reduce((current, [name, replacement]) => current.replaceAll(`{${name}}`, String(replacement)), text)
    : text;
}

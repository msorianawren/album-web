import "server-only";
import { cookies, headers } from "next/headers";
import {
  dictionaries,
  localeCookieName,
  normalizeLocale,
  translate,
  type Locale,
} from "@/lib/i18n-shared";

export async function getRequestLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get(localeCookieName)?.value;
  if (cookieLocale) return normalizeLocale(cookieLocale);

  const accepted = (await headers()).get("accept-language")?.split(",")[0];
  return normalizeLocale(accepted);
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.en;
}

export { localeCookieName, translate };

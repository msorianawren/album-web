"use client";

import { useEffect, useMemo, useState } from "react";
import {
  I18nContext,
  detectClientLocale,
  dictionaries,
  persistLocale,
  translate,
  type Locale,
} from "@/lib/i18n-client";

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const detected = detectClientLocale();
      if (detected !== locale) setLocaleState(detected);
      persistLocale(detected);
    }, 0);
    return () => window.clearTimeout(timer);
    // Run once on mount so server-rendered cookie/header preference wins first,
    // while browser language fills the gap on a first visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => {
    const dictionary = dictionaries[locale] ?? dictionaries.en;
    return {
      locale,
      dictionary,
      setLocale(nextLocale: Locale) {
        setLocaleState(nextLocale);
        persistLocale(nextLocale);
      },
      t(key: string, values?: Record<string, string | number>) {
        return translate(dictionary, key, values);
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

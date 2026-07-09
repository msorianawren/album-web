"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { AppLocale, LOCALES, getStoredLocale, setStoredLocale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const [locale, setLocale] = useState<AppLocale>("en");

  useEffect(() => {
    setLocale(getStoredLocale());
  }, []);

  function handleLocaleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newLocale = event.target.value as AppLocale;
    setLocale(newLocale);
    setStoredLocale(newLocale);
    // Reload to apply locale if the app relies on server-side rendering for i18n
    window.location.reload();
  }

  return (
    <div className="relative mt-1 flex w-full items-center justify-between gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-within:ring-2 focus-within:ring-ring">
      <span className="inline-flex items-center gap-3 pointer-events-none">
        <Globe className="h-4 w-4 text-muted-accent" aria-hidden="true" />
        {locale === "vi" ? "Ngôn ngữ" : "Language"}
      </span>
      <select
        value={locale}
        onChange={handleLocaleChange}
        className="absolute inset-0 h-full w-full appearance-none bg-transparent opacity-0 cursor-pointer"
        aria-label="Select language"
      >
        {Object.entries(LOCALES).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none text-xs text-text-secondary">
        {LOCALES[locale]}
      </span>
    </div>
  );
}

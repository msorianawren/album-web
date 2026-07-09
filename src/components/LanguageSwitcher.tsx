"use client";

import { useEffect, useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { AppLocale, LOCALES, getStoredLocale, setStoredLocale } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

export function LanguageSwitcher({ dict }: { dict?: any }) {
  const [locale, setLocale] = useState<AppLocale>("en");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocale(getStoredLocale());
  }, []);

  function handleLocaleChange(newLocale: AppLocale) {
    setLocale(newLocale);
    setStoredLocale(newLocale);
    window.location.reload();
  }

  return (
    <div className="relative mt-1 flex w-full flex-col rounded-[1rem] bg-transparent text-left text-sm font-medium text-text-primary transition focus-within:ring-2 focus-within:ring-ring">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 rounded-[1rem] transition hover:bg-background focus:outline-none"
      >
        <span className="inline-flex items-center gap-3">
          <Globe className="h-4 w-4 text-muted-accent" aria-hidden="true" />
          {dict?.common?.language || "Language"}
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-text-secondary">
          {LOCALES[locale]}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 pt-1 flex flex-col gap-1">
              {Object.entries(LOCALES).map(([code, name]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleLocaleChange(code as AppLocale)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                    locale === code 
                      ? "bg-accent/10 text-accent font-semibold" 
                      : "hover:bg-surface text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {name}
                  {locale === code && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { ToastProviderCore, useToast } from "@/hooks/useToast";

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none w-full px-4 sm:w-auto">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon =
            t.type === "success"
              ? CheckCircle2
              : t.type === "error"
              ? AlertCircle
              : Info;

          const colorClass =
            t.type === "success"
              ? "text-green-500 dark:text-green-400"
              : t.type === "error"
              ? "text-red-500 dark:text-red-400"
              : "text-blue-500 dark:text-blue-400";

          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full border border-border bg-background/90 backdrop-blur-xl px-5 py-3 shadow-2xl shadow-text-primary/10 sm:w-max"
            >
              <Icon className={`h-5 w-5 shrink-0 ${colorClass}`} />
              <p className="text-sm font-medium text-text-primary flex-1">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded-full p-1 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProviderCore>
      {children}
      <ToastContainer />
    </ToastProviderCore>
  );
}

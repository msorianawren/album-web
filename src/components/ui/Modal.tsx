"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  className?: string;
  onClose: () => void;
}

export function Modal({ open, title, children, className, onClose }: ModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            className={cn(
              "relative w-full max-w-lg rounded-3xl border border-border bg-background p-6 shadow-2xl shadow-text-primary/10",
              className,
            )}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-text-primary">
                {title}
              </h2>
              <Button
                variant="icon"
                className="h-9 w-9"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

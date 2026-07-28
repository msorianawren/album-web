"use client";

import { Copy, Send } from "lucide-react";
import { useState } from "react";
import type { PublicTelegramContact } from "@/lib/contact/telegram";

export function TelegramContactCard({ telegram }: { telegram: PublicTelegramContact }) {
  const [feedback, setFeedback] = useState("");
  async function copyUsername() {
    try {
      await navigator.clipboard.writeText(telegram.displayUsername);
      setFeedback("Telegram username copied.");
    } catch {
      setFeedback(`Copy unavailable. Please copy ${telegram.displayUsername}.`);
    }
  }
  return <aside className="order-first rounded-[2rem] border border-border bg-surface/90 p-6 shadow-xl shadow-text-primary/5 sm:p-8 lg:sticky lg:top-28 lg:self-start">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background/70 text-muted-accent"><Send className="h-5 w-5" aria-hidden="true" /></div>
    <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Telegram</p>
    <h2 className="mt-2 text-2xl font-semibold text-text-primary">The quickest way to say hello.</h2>
    <p className="mt-3 text-lg text-text-secondary">{telegram.displayUsername}</p>
    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <a href={telegram.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Message Oriana</a>
      <button type="button" onClick={copyUsername} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-5 text-sm font-semibold text-text-primary transition duration-200 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Copy Telegram username ${telegram.displayUsername}`}><Copy className="h-4 w-4" aria-hidden="true" />Copy username</button>
    </div>
    {feedback ? <p className="mt-3 text-xs text-text-secondary" role="status">{feedback}</p> : null}
    <p className="mt-6 text-xs leading-relaxed text-text-secondary">Opens the official Telegram app or website. Never share passwords or verification codes.</p>
  </aside>;
}

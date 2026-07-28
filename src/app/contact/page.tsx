import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { ContactForm } from "@/components/contact/ContactForm";
import { UserConversationList } from "@/components/contact/UserConversationList";
import { HelpInbox } from "@/components/help/HelpInbox";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";
import { LockKeyhole, Mail } from "lucide-react";
import { TelegramContactCard } from "@/components/contact/TelegramContactCard";
import { getPublicSession } from "@/lib/auth";
import { resolvePublicTelegramContact } from "@/lib/contact/telegram";
import { getLandingPage } from "@/lib/landing";
import { getSiteSettings } from "@/lib/site-settings";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Contact her",
  description: "A private line to Oriana for album access, editorial work, licensing, or a hello.",
};

export default async function ContactPage() {
  const [settings, landing, session] = await Promise.all([getSiteSettings(), getLandingPage(), getPublicSession()]);
  const telegram = resolvePublicTelegramContact(landing.social_links);
  const hasForm = Boolean(settings.contact_email) || settings.contact_form_mode !== "mailto_only";
  let legacyThreads: Array<{ id: string; subject: string; message_body: string; created_at: string; status: string; replies: Array<{ id: string; author_type: "user" | "admin"; body: string; public_display_name: string; created_at: string }> }> = [];

  if (session.userId) {
    const { data } = await supabase.from("contact_messages").select("id, subject, message_body, created_at, status").eq("user_id", session.userId).order("created_at", { ascending: false });
    const threadIds = (data ?? []).map((thread) => thread.id);
    const { data: replies } = threadIds.length > 0
      ? await supabase.from("contact_message_replies").select("id, message_id, author_type, body, public_display_name, created_at").in("message_id", threadIds).eq("is_internal_note", false).order("created_at", { ascending: true })
      : { data: [] };
    legacyThreads = (data ?? []).map((thread) => ({
      ...thread,
      replies: (replies ?? []).filter((reply) => reply.message_id === thread.id).map((reply) => ({
        id: reply.id,
        author_type: reply.author_type,
        body: reply.body,
        public_display_name: reply.public_display_name,
        created_at: reply.created_at,
      })),
    }));
  }

  return <>
    <NatureAnimatedBackground config={landing.background_settings} />
    <main className="relative z-10 min-h-screen pb-20">
      <AppHeader />
      <section className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:px-8 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">A private line to Oriana</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text-primary sm:text-6xl">Contact her</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">For private album access, editorial work, licensing, or simply saying hello. Choose the way that feels most natural.</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {telegram ? <TelegramContactCard telegram={telegram} /> : null}

          <div className="rounded-[2rem] border border-border bg-surface/85 p-6 shadow-xl shadow-text-primary/5 sm:p-8">
            <div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background/70"><Mail className="h-5 w-5 text-muted-accent" aria-hidden="true" /></div><div><h2 className="text-2xl font-semibold text-text-primary">Send a private message</h2><p className="mt-2 text-sm leading-relaxed text-text-secondary">A quieter option for detailed requests.</p></div></div>
            {hasForm ? <div className="mt-8"><ContactForm contactEmail={settings.contact_email ?? undefined} formMode={settings.contact_form_mode} allowedTypes={settings.contact_allowed_inquiry_types} maxMessage={settings.contact_max_message_length} maxSubject={settings.contact_max_subject_length} maxName={settings.contact_max_name_length} initialEmail={session.email ?? ""} initialName={session.displayName ?? ""} useUnifiedInbox={Boolean(session.userId)} isAuthenticated={Boolean(session.userId)} senderLabel={session.displayName || session.email || ""} /></div> : <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-text-secondary">Private messages are temporarily unavailable. Please request access from an album page.</div>}
          </div>
        </div>

        {session.userId ? <HelpInbox /> : null}
        {legacyThreads.length > 0 ? <section className="mt-12 border-t border-border pt-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Older conversations</p><UserConversationList initialThreads={legacyThreads} /></section> : null}
        {!session.userId ? <div className="mt-12 flex gap-3 rounded-2xl border border-border bg-surface/70 p-5 text-sm text-text-secondary"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-muted-accent" aria-hidden="true" /><p>For account questions and request history, sign in to continue through the private website conversation.</p></div> : null}
      </section>
    </main>
  </>;
}

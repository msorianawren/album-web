import { AppHeader } from "@/components/AppHeader";
import { getSiteSettings } from "@/lib/site-settings";
import { getLandingPage } from "@/lib/landing";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";
import { Lock, Camera, Download, Mail } from "lucide-react";
import Link from "next/link";

export default async function ContactPage() {
  const [settings, landing] = await Promise.all([
    getSiteSettings(),
    getLandingPage()
  ]);
  const hasEmail = Boolean(settings.contact_email);

  return (
    <main className="relative z-10 min-h-screen bg-transparent pb-20">
      <NatureAnimatedBackground config={landing.background_settings} />
      <AppHeader />
      
      <section className="mx-auto w-full max-w-[1024px] px-4 py-12 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            Inquiries
          </p>
          <h1 className="mt-4 break-words text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
            Let&apos;s connect
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-text-secondary">
            Reach out regarding private album access, editorial collaborations, or commercial usage permissions.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.5rem] border border-border bg-surface p-6 shadow-sm">
            <Lock className="h-6 w-6 text-accent" />
            <h3 className="mt-4 text-base font-semibold text-text-primary">Private Access</h3>
            <p className="mt-2 text-sm text-text-secondary">Request permission to view restricted portfolio galleries.</p>
          </div>
          <div className="rounded-[1.5rem] border border-border bg-surface p-6 shadow-sm">
            <Camera className="h-6 w-6 text-accent" />
            <h3 className="mt-4 text-base font-semibold text-text-primary">Collaboration</h3>
            <p className="mt-2 text-sm text-text-secondary">Booking inquiries for editorial and campaign shoots.</p>
          </div>
          <div className="rounded-[1.5rem] border border-border bg-surface p-6 shadow-sm">
            <Download className="h-6 w-6 text-accent" />
            <h3 className="mt-4 text-base font-semibold text-text-primary">Downloads</h3>
            <p className="mt-2 text-sm text-text-secondary">Commercial licensing and high-resolution media access.</p>
          </div>
          <div className="rounded-[1.5rem] border border-border bg-surface p-6 shadow-sm">
            <Mail className="h-6 w-6 text-accent" />
            <h3 className="mt-4 text-base font-semibold text-text-primary">General</h3>
            <p className="mt-2 text-sm text-text-secondary">Any other questions or greetings you might have.</p>
          </div>
        </div>

        <div className="mt-16 overflow-hidden rounded-[2rem] border border-border bg-surface-secondary/30">
          <div className="grid md:grid-cols-2">
            <div className="p-8 sm:p-12">
              <h2 className="text-2xl font-semibold text-text-primary">Direct Message</h2>
              <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                {hasEmail 
                  ? "Send an email directly to the owner. Please include relevant details about your inquiry."
                  : "Direct contact is currently being prepared. Check back later or request access via the album pages."}
              </p>
              
              <div className="mt-8">
                {hasEmail ? (
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold uppercase tracking-wider text-accent-foreground transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Open Email Client
                  </a>
                ) : (
                  <div className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface/50 px-8 text-sm font-semibold uppercase tracking-wider text-text-secondary opacity-70 cursor-not-allowed">
                    Unavailable
                  </div>
                )}
              </div>
            </div>
            <div className="hidden bg-surface/50 p-8 sm:p-12 md:block">
              <div className="h-full w-full rounded-2xl border border-dashed border-border flex items-center justify-center text-text-secondary">
                <Mail className="h-12 w-12 opacity-20" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

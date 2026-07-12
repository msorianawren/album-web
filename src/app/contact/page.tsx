import { AppHeader } from "@/components/AppHeader";
import { getSiteSettings } from "@/lib/site-settings";
import { getLandingPage } from "@/lib/landing";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";
import { Lock, Camera, Download, Mail } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";
import { CopyEmailButton } from "@/components/contact/CopyEmailButton";
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
                  ? "Use the form to draft an email directly to the owner. Please include relevant details about your inquiry."
                  : "Direct contact is currently being prepared. Check back later or request access via the album pages."}
              </p>
              
                <div className="mt-12">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/80 border border-border">
                      <Mail className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Email Address</p>
                      <div className="flex items-center mt-0.5">
                        <p className="text-sm font-medium text-text-primary">
                          {settings.contact_email || "Unavailable"}
                        </p>
                        {settings.contact_email && <CopyEmailButton email={settings.contact_email} />}
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            <div className="bg-surface/50 p-8 sm:p-12 border-t border-border md:border-t-0 md:border-l">
              {hasEmail || settings.contact_form_mode !== "mailto_only" ? (
                <ContactForm 
                  contactEmail={settings.contact_email!} 
                  formMode={settings.contact_form_mode}
                  allowedTypes={settings.contact_allowed_inquiry_types}
                  maxMessage={settings.contact_max_message_length}
                  maxSubject={settings.contact_max_subject_length}
                  maxName={settings.contact_max_name_length}
                />
              ) : (
                <div className="h-full w-full rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-text-secondary p-8 text-center min-h-[300px]">
                  <Mail className="h-12 w-12 opacity-20 mb-4" />
                  <p>Contact form is currently unavailable</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

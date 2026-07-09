import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";
import { getLandingPage } from "@/lib/landing";

export async function AppFooter() {
  const [settings, landing] = await Promise.all([
    getSiteSettings(),
    getLandingPage(),
  ]);

  const socialLinks = (landing.social_links || []).filter(l => l.enabled && !!l.url);
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/albums", label: "Albums" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <footer className="relative z-10 border-t border-border bg-background/95 backdrop-blur-md px-6 py-16 sm:py-24">
      <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-6">
          <Link href="/" className="inline-block">
            {settings.site_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.site_logo_url} alt={settings.site_logo_alt ?? settings.site_name} className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-lg font-semibold uppercase tracking-[0.22em] text-text-primary">
                {settings.site_name || "Oriana Wren"}
              </span>
            )}
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
            {settings.footer_description}
          </p>
          {settings.contact_email && (
            <a href={`mailto:${settings.contact_email}`} className="text-sm font-medium text-text-primary hover:text-accent">
              {settings.contact_email}
            </a>
          )}
        </div>

        <div className="grid gap-12 sm:grid-cols-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-text-primary">
              Navigation
            </h4>
            <ul className="mt-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-secondary transition hover:text-text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-text-primary">
              Connect
            </h4>
            {socialLinks.length > 0 ? (
              <ul className="mt-6 flex flex-col gap-4">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <a href={link.url} target="_blank" rel="noreferrer" className="text-sm text-text-secondary transition hover:text-text-primary">
                      {link.platform}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm italic text-text-secondary">No public links</p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-text-primary">
              Notice
            </h4>
            <p className="mt-6 text-sm leading-relaxed text-text-secondary">
              {settings.footer_note}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-[1200px] flex-col items-center justify-between border-t border-border pt-8 sm:flex-row sm:mt-24">
        <p className="text-xs text-text-secondary">
          &copy; {currentYear} {settings.site_name}. All rights reserved.
        </p>
        <p className="mt-4 text-xs text-text-secondary sm:mt-0">
          Built as a private visual archive.
        </p>
      </div>
    </footer>
  );
}

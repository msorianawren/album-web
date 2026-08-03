import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";
import { getLandingPage } from "@/lib/landing";

export async function AppFooter() {
  const [settings, landing] = await Promise.all([getSiteSettings(), getLandingPage()]);
  const socialLinks = (landing.social_links || []).filter((link) => link.enabled && link.url);
  const currentYear = new Date().getFullYear();
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/albums", label: "Albums" },
    { href: "/games", label: "Games" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <footer className="relative z-20 mt-20 border-t border-border/40 bg-surface/85 backdrop-blur-xl transition-colors">
      <div className="mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 lg:gap-12">
          {/* Brand Column */}
          <div className="flex flex-col gap-4 sm:col-span-2 md:col-span-1">
            <Link href="/" prefetch={false} className="inline-block w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
              {settings.site_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.site_logo_url}
                  alt={settings.site_logo_alt ?? settings.site_name}
                  className="h-12 w-12 sm:h-14 sm:w-14 object-contain transition-transform duration-300 hover:scale-105"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/brand/oriana-wren-seal.svg"
                  alt={settings.site_name || "Oriana Wren"}
                  className="h-12 w-12 sm:h-14 sm:w-14 object-contain transition-transform duration-300 hover:scale-105"
                />
              )}
            </Link>
            <div className="font-serif text-lg font-light tracking-wide text-text-primary">
              {settings.site_name || "Oriana Wren"}
            </div>
            {settings.footer_description ? (
              <p className="text-xs leading-relaxed text-text-secondary max-w-sm">
                {settings.footer_description}
              </p>
            ) : null}
            {settings.contact_email ? (
              <a
                href={`mailto:${settings.contact_email}`}
                className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors underline-offset-4 hover:underline w-fit"
              >
                {settings.contact_email}
              </a>
            ) : null}
          </div>

          {/* Navigation Column */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-text-secondary">
              Navigation
            </h2>
            <nav aria-label="Footer navigation" className="flex flex-col gap-2.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors w-fit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Connect / Social Column */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-text-secondary">
              Connect
            </h2>
            <div className="flex flex-col gap-2.5">
              {socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors w-fit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                >
                  {link.platform}
                </a>
              ))}
              {settings.contact_email && socialLinks.length === 0 ? (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors w-fit"
                >
                  Email
                </a>
              ) : null}
            </div>
          </div>

          {/* Notice Column */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-text-secondary">
              Notice
            </h2>
            <p className="text-xs leading-relaxed text-text-secondary">
              {settings.footer_note || "Some albums are public, some are still being updated, and selected collections remain private by request."}
            </p>
          </div>
        </div>

        {/* Legal Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-[0.75rem] text-text-secondary/80">
          <p>&copy; {currentYear} {settings.site_name || "Oriana Wren"}. All rights reserved.</p>
          <p className="font-light tracking-wide">Built as a private visual archive.</p>
        </div>
      </div>
    </footer>
  );
}

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
    <footer className="lcb-footer">
      <div className="lcb-footer__grid">
        <div className="lcb-footer__brand">
          <Link href="/" prefetch={false}>
            {settings.site_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.site_logo_url} alt={settings.site_logo_alt ?? settings.site_name} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/brand/oriana-wren-seal.svg" alt={settings.site_name || "Oriana Wren"} />
            )}
          </Link>
          <p>{settings.footer_description}</p>
          {settings.contact_email ? <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a> : null}
        </div>

        <nav aria-label="Footer navigation">
          <h2>Navigation</h2>
          {navLinks.map((link) => <Link key={link.href} href={link.href} prefetch={false}>{link.label}</Link>)}
        </nav>

        <div className="lcb-footer__connect">
          <h2>Connect</h2>
          {socialLinks.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer">{link.platform}</a>)}
          {settings.contact_email && socialLinks.length === 0 ? <a href={`mailto:${settings.contact_email}`}>Email</a> : null}
        </div>

        <div className="lcb-footer__notice">
          <h2>Notice</h2>
          <p>{settings.footer_note}</p>
        </div>
      </div>

      <div className="lcb-footer__legal">
        <p>&copy; {currentYear} {settings.site_name}. All rights reserved.</p>
        <p>Built as a private visual archive.</p>
      </div>
    </footer>
  );
}

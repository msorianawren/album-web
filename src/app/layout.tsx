import type { Metadata, Viewport } from "next";
import { OAuthHashHandler } from "@/components/auth/OAuthHashHandler";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { getRequestLocale } from "@/lib/i18n";
import { localeMeta, supportedLocales } from "@/lib/i18n-shared";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Album Web",
    template: "%s | Album Web",
  },
  description: "A premium minimal photo gallery for private and public albums.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const dir = localeMeta[locale].dir;
  const localeList = JSON.stringify(supportedLocales);

  return (
    <html lang={locale} dir={dir} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("album-theme");if(t==="night"){document.documentElement.classList.add("theme-night")}else{document.documentElement.classList.remove("theme-night")}var k="album-locale";var s=${localeList};var c=document.cookie.split("; ").find(function(p){return p.indexOf(k+"=")===0});var active=localStorage.getItem(k)||(c&&c.split("=")[1]);if(!active){var n=(navigator.languages&&navigator.languages[0])||navigator.language||"en";active=s.find(function(l){return n===l||n.toLowerCase().indexOf(l.toLowerCase())===0})||(n.toLowerCase().indexOf("zh")===0?"zh-CN":"en");localStorage.setItem(k,active);document.cookie=k+"="+active+"; path=/; max-age=31536000; SameSite=Lax"}document.documentElement.lang=active;document.documentElement.dir=active==="ar"?"rtl":"ltr"}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <I18nProvider initialLocale={locale}>
          <OAuthHashHandler />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

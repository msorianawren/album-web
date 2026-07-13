import type { Metadata, Viewport } from "next";
import { OAuthHashHandler } from "@/components/auth/OAuthHashHandler";
import { AudioUXProvider } from "@/components/ui/AudioUXProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";

import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const faviconUrl = settings.site_favicon_url || "/favicon.ico";
  const appIconUrl = settings.advanced_settings?.app_icon_url || "/icon.png";
  const appleIconUrl = settings.advanced_settings?.apple_touch_icon_url || "/apple-icon.png";
  const v = settings.advanced_settings?.brand_updated_at ? `?v=${settings.advanced_settings.brand_updated_at}` : "";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.orianawren.com"),
    title: {
      default: settings.seo_title || settings.site_name || "Album Web",
      template: `%s | ${settings.site_name || "Album Web"}`,
    },
    description: settings.seo_description || settings.site_description || "A premium minimal photo gallery.",
    icons: {
      icon: `${faviconUrl}${v}`,
      shortcut: `${faviconUrl}${v}`,
      apple: `${appleIconUrl}${v}`,
      other: {
        rel: "icon",
        url: `${appIconUrl}${v}`,
        type: "image/png",
        sizes: "512x512",
      },
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("album-theme");var n=t==="night"||(t!=="day"&&(new Date().getHours()<6||new Date().getHours()>=18));if(n){document.documentElement.classList.add("theme-night")}else{document.documentElement.classList.remove("theme-night")}}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <AudioUXProvider 
          defaultAmbient={settings.advanced_settings?.default_ambient_sound || "drone"}
          defaultClick={settings.advanced_settings?.default_click_sound || "water"}
        />
        <ToastProvider>
          <OAuthHashHandler />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

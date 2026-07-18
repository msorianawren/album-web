import type { Metadata, Viewport } from "next";
import { OAuthHashHandler } from "@/components/auth/OAuthHashHandler";
import { OrianaCompanionRuntime } from "@/components/assistant/OrianaCompanionRuntime";
import { AudioUXProvider } from "@/components/ui/AudioUXProvider";
import { PublicDepthEnvironment } from "@/components/environment/PublicDepthEnvironment";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";
import "@/components/assistant/assistant-pet.css";

import { getPublicSession } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";

function stringSetting(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const faviconUrl = settings.site_favicon_url || "/favicon.ico";
  const appIconUrl = stringSetting(settings.advanced_settings?.app_icon_url, "/icon.png");
  const appleIconUrl = stringSetting(settings.advanced_settings?.apple_touch_icon_url, "/apple-icon.png");
  const brandVersion = stringSetting(settings.advanced_settings?.brand_updated_at, "oriana-wren-v1");
  const v = `?v=${brandVersion}`;

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.orianawren.com"),
    title: {
      default: settings.seo_title || settings.site_name || "Album Web",
      template: `%s | ${settings.site_name || "Album Web"}`,
    },
    description: settings.seo_description || settings.site_description || "A premium minimal photo gallery.",
    icons: {
      icon: [
        { url: `${faviconUrl}${v}`, type: "image/x-icon" },
        { url: `/icon.svg${v}`, type: "image/svg+xml" },
        { url: `${appIconUrl}${v}`, type: "image/png", sizes: "512x512" },
      ],
      shortcut: [{ url: `${faviconUrl}${v}`, type: "image/x-icon" }],
      apple: [{ url: `${appleIconUrl}${v}`, sizes: "180x180", type: "image/png" }],
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
  const [settings, session] = await Promise.all([
    getSiteSettings(),
    getPublicSession(),
  ]);
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-full flex-col">
        <AudioUXProvider 
          defaultAmbient={stringSetting(settings.advanced_settings?.default_ambient_sound, "drone")}
          defaultClick={stringSetting(settings.advanced_settings?.default_click_sound, "water")}
        />
        <ToastProvider>
          <OAuthHashHandler />
          <PublicDepthEnvironment />
          {children}
          <OrianaCompanionRuntime session={session} />
        </ToastProvider>
      </body>
    </html>
  );
}

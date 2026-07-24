import type { Metadata, Viewport } from "next";
import { OAuthHashHandler } from "@/components/auth/OAuthHashHandler";
import { AudioUXProvider } from "@/components/ui/AudioUXProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { EnvironmentShell, CompanionShell } from "./LayoutClientShells";
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

import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair",
});

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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${playfair.variable} font-sans flex min-h-full flex-col`}>
        <AudioUXProvider 
          defaultAmbient={stringSetting(settings.advanced_settings?.default_ambient_sound, "drone")}
          defaultClick={stringSetting(settings.advanced_settings?.default_click_sound, "water")}
        />
        <ToastProvider>
          <OAuthHashHandler />
          <EnvironmentShell />
          {children}
          <CompanionShell session={session} />
        </ToastProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { OAuthHashHandler } from "@/components/auth/OAuthHashHandler";
import "./globals.css";

import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  
  return {
    title: {
      default: settings.seo_title || settings.site_name || "Album Web",
      template: `%s | ${settings.site_name || "Album Web"}`,
    },
    description: settings.seo_description || settings.site_description || "A premium minimal photo gallery.",
    icons: settings.site_favicon_url ? {
      icon: settings.site_favicon_url,
      shortcut: settings.site_favicon_url,
      apple: settings.site_favicon_url,
    } : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("album-theme");if(t==="night"){document.documentElement.classList.add("theme-night")}else{document.documentElement.classList.remove("theme-night")}}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <OAuthHashHandler />
        {children}
      </body>
    </html>
  );
}

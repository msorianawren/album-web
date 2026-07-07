import type { Metadata } from "next";
import { OAuthHashHandler } from "@/components/auth/OAuthHashHandler";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Album Web",
    template: "%s | Album Web",
  },
  description: "A premium minimal photo gallery for private and public albums.",
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

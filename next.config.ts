import type { NextConfig } from "next";

const r2PublicHostname = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : "pub-6723a3eac8f14389ad2429799e3b98a5.r2.dev";
const r2PublicOrigin = `https://${r2PublicHostname}`;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: r2PublicHostname,
      },
    ],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://images.unsplash.com https://*.googleusercontent.com https://*.r2.dev ${r2PublicOrigin} https://pub-6723a3eac8f14389ad2429799e3b98a5.r2.dev https://*.supabase.co`,
      `media-src 'self' blob: https://*.r2.dev ${r2PublicOrigin} https://pub-6723a3eac8f14389ad2429799e3b98a5.r2.dev`,
      `connect-src 'self' https://*.supabase.co https://*.r2.dev ${r2PublicOrigin} https://*.r2.cloudflarestorage.com https://pub-6723a3eac8f14389ad2429799e3b98a5.r2.dev https://www.orianawren.com https://orianawren.com`,
      "font-src 'self' data:",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
      {
        source: "/studio/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

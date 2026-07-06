import type { NextConfig } from "next";

const r2PublicHostname = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : "pub-6723a3eac8f14389ad2429799e3b98a5.r2.dev";

const nextConfig: NextConfig = {
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
};

export default nextConfig;

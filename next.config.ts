import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "pub-6723a3eac8f14389ad2429799e3b98a5.r2.dev",
      },
    ],
  },
};

export default nextConfig;

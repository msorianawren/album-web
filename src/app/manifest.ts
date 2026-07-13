import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oriana Wren",
    short_name: "Oriana Wren",
    description: "A private editorial album space for Oriana Wren.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f0e6",
    theme_color: "#3c2e25",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

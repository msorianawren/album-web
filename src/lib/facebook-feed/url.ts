import type { FacebookEmbedKind, FacebookEmbedKindInput } from "@/lib/facebook-feed/types";

const allowedHosts = new Set(["facebook.com", "www.facebook.com", "web.facebook.com", "m.facebook.com"]);
const unsafeTrackingParams = new Set(["fbclid", "ref", "__tn__", "hc_ref", "mibextid"]);

export function canonicalizeFacebookUrl(input: string): string {
  const raw = input.trim();
  if (!raw || raw.length > 2_000 || /[<>\s]/.test(raw)) throw new Error("Enter a public HTTPS Facebook permalink, not embed code.");
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Enter a valid public HTTPS Facebook permalink."); }
  if (url.hostname.toLowerCase() === "fb.watch") throw new Error("Use the full facebook.com permalink instead of fb.watch.");
  if (url.protocol !== "https:" || url.username || url.password || url.port || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error("Use a public HTTPS permalink from facebook.com.");
  }
  if (url.hostname.startsWith("xn--") || url.pathname === "/" || url.pathname === "") {
    throw new Error("Use the full permalink for a Facebook post, video, or Reel.");
  }
  if (url.hostname.toLowerCase() === "facebook.com" && raw.includes("@")) throw new Error("Use a public Facebook permalink without credentials.");
  url.protocol = "https:";
  url.hostname = "www.facebook.com";
  url.hash = "";
  for (const [name] of url.searchParams) {
    if (unsafeTrackingParams.has(name.toLowerCase()) || name.toLowerCase().startsWith("utm_")) url.searchParams.delete(name);
  }
  if (url.pathname === "/watch/" && !url.searchParams.get("v")) throw new Error("Use the full permalink for the Facebook video.");
  return url.toString();
}

export function inferFacebookEmbedKind(canonicalUrl: string, requested: FacebookEmbedKindInput = "auto"): FacebookEmbedKind {
  if (requested !== "auto") return requested;
  const path = new URL(canonicalUrl).pathname.toLowerCase();
  if (path.includes("/reel/")) return "reel";
  return path.includes("/videos/") || path === "/watch/" || path === "/video.php" ? "video" : "post";
}

export function buildFacebookEmbedUrl(canonicalUrl: string, kind: FacebookEmbedKind): string {
  const embed = new URL(kind === "video" ? "https://www.facebook.com/plugins/video.php" : "https://www.facebook.com/plugins/post.php");
  embed.searchParams.set("href", canonicalUrl);
  embed.searchParams.set("show_text", "false");
  return embed.toString();
}

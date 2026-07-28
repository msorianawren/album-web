import type { LandingSocialLink } from "@/lib/types";

export type PublicTelegramContact = {
  username: string;
  displayUsername: string;
  href: string;
};

const USERNAME = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

function normalizeCandidate(value: string) {
  const candidate = value.trim();
  if (!candidate) return null;
  if (candidate.startsWith("@")) return candidate.slice(1);
  if (!candidate.includes("://")) return candidate;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || !["t.me", "telegram.me"].includes(url.hostname.toLowerCase())) return null;
  if (url.search || url.hash) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length === 1 ? parts[0] : null;
}

export function resolvePublicTelegramContact(
  socialLinks: readonly LandingSocialLink[] | null | undefined,
): PublicTelegramContact | null {
  const entry = socialLinks?.find(
    (link) => link.enabled && link.platform.trim().toLowerCase() === "telegram",
  );
  if (!entry) return null;

  const username = normalizeCandidate(entry.url);
  if (!username || !USERNAME.test(username)) return null;
  return { username, displayUsername: `@${username}`, href: `https://t.me/${username}` };
}

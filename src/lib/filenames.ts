export function safeFilename(value: string, fallback = "download") {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return cleaned || fallback;
}

export function sanitizeZipPathSegment(value: string, fallback = "folder") {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9.\-_ ]+/g, "-") // Allow spaces, replace bad chars with hyphens
    .replace(/^\.+|\.+$/g, "") // Remove leading/trailing dots
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .replace(/\s+/g, "-") // Convert spaces to hyphens
    .slice(0, 80);

  return cleaned || fallback;
}

export function extensionFromUrlOrMime(url: string, mimeType?: string | null) {
  const pathExt = url.split("?")[0]?.split(".").pop();
  if (pathExt && pathExt.length <= 5) return pathExt;
  if (mimeType?.includes("/")) {
    return mimeType.split("/")[1].replace("jpeg", "jpg").replace("quicktime", "mov");
  }
  return "bin";
}

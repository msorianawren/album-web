export function safeFilename(value: string, fallback = "download") {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

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

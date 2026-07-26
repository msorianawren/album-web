export function viewerUrlForMedia(currentUrl: string, mediaId: string) {
  const url = new URL(currentUrl);
  url.searchParams.set("media", mediaId);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function viewerUrlWithoutMedia(currentUrl: string) {
  const url = new URL(currentUrl);
  url.searchParams.delete("media");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function viewerIndexFromMediaId(
  media: ReadonlyArray<{ id: string }>,
  mediaId: string | null,
) {
  if (!mediaId) return null;
  const index = media.findIndex((item) => item.id === mediaId);
  return index === -1 ? null : index;
}

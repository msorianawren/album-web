export const storyViewedStorageKey = "orianawren:facebook-story-viewed";
export function storyProgress(currentTime: number, duration: number | null | undefined) {
  if (!duration || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(0, Math.min(1, currentTime / duration));
}

export function nextStoryIndex(index: number, count: number) {
  return count > 0 ? (index + 1) % count : 0;
}

export function previousStoryIndex(index: number, count: number) {
  return count > 0 ? (index - 1 + count) % count : 0;
}

export function isHorizontalStorySwipe(startX: number, endX: number, startY: number, endY: number) {
  return Math.abs(endX - startX) >= 44 && Math.abs(endX - startX) > Math.abs(endY - startY);
}

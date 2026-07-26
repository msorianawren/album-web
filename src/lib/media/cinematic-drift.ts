export type SlideshowPace = "still" | "slow" | "cinema";

export function slideshowInterval(pace: SlideshowPace, isVideo: boolean) {
  if (isVideo) return 9_000;
  if (pace === "slow") return 10_500;
  if (pace === "cinema") return 7_000;
  return 4_200;
}

export function cinematicDrift(mediaId: string) {
  let hash = 0;
  for (const character of mediaId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const x = ((hash & 3) - 1.5) * 0.72;
  const y = (((hash >>> 2) & 3) - 1.5) * 0.58;
  return { scale: 1.035, x: `${x.toFixed(2)}%`, y: `${y.toFixed(2)}%` };
}

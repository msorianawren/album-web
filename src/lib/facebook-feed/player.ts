export function resolveFacebookPlayerFrame(input: { embed_kind: "post" | "video" | "reel"; width?: number | null; height?: number | null; aspect_ratio?: string | null }) {
  const ratio = input.width && input.height ? [input.width, input.height] : input.aspect_ratio?.split(":").map(Number);
  const [width, height] = Array.isArray(ratio) && ratio.length === 2 && ratio[0] > 0 && ratio[1] > 0
    ? ratio : input.embed_kind === "reel" ? [9, 16] : [16, 9];
  return { aspectRatio: `${width} / ${height}`, width: `min(100%, calc(70dvh * ${width} / ${height}))` };
}

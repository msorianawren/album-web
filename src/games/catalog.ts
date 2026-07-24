import type { GameCatalogEntry } from "./core/types.ts";

export const gameCatalog = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "puzzle-atelier",
    title: "Puzzle Atelier",
    description: "Oriana Wren's existing editorial sliding and swap puzzle.",
    engineKey: "legacy-puzzle-atelier",
    legacy: true,
    enabled: true,
  },
] as const satisfies readonly GameCatalogEntry[];

export function getGameCatalogEntry(slug: string) {
  return gameCatalog.find((entry) => entry.slug === slug) ?? null;
}

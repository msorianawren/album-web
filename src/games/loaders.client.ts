"use client";

export type GameClientModuleLoader = () => Promise<unknown>;

export const gameClientLoaders: Readonly<Record<string, GameClientModuleLoader>> = {
  "puzzle-atelier": () => import("@/components/games/PuzzleAtelier"),
};

export function loadGameClientModule(slug: string) {
  const loader = gameClientLoaders[slug];
  if (!loader) throw new Error(`No client module is registered for game "${slug}".`);
  return loader();
}

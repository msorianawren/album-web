"use client";

import type { ComponentType } from "react";
import type { GameClientProps } from "./core/types";

export type LoadedGameComponent = ComponentType<GameClientProps & Record<string, unknown>>;
export type GameClientModuleLoader = () => Promise<{ default: LoadedGameComponent }>;

export const gameClientLoaders: Readonly<Record<string, GameClientModuleLoader>> = {
  "snake": () => import("@/games/engines/snake/SnakeGame"),
  "feather-merge": () => import("@/games/engines/feather-merge/FeatherMergeGame"),
  "memory-garden": () => import("@/games/engines/memory-garden/MemoryGardenGame"),
  "quiet-meadow": () => import("@/games/engines/quiet-meadow/QuietMeadowGame"),
  "echo-chimes": () => import("@/games/engines/echo-chimes/EchoChimesGame"),
  "wren-flight": () => import("@/games/engines/wren-flight/WrenFlightGame"),
  "zen-cairn": () => import("@/games/engines/zen-cairn/ZenCairnGame"),
  "puzzle-atelier": () => import("@/components/games/PuzzleAtelier").then((module) => ({
    default: module.PuzzleAtelier as LoadedGameComponent,
  })),
};

export function loadGameClientModule(slug: string) {
  const loader = gameClientLoaders[slug];
  if (!loader) throw new Error(`No client module is registered for game "${slug}".`);
  return loader();
}

"use client";

import type { EnvironmentState } from "@/lib/environment/presets";
import type { WindRuntime } from "@/lib/environment/wind";

export function FoliageInstances({
  state,
  active,
  wind,
  reduced,
}: {
  state: EnvironmentState;
  active: boolean;
  wind: React.MutableRefObject<WindRuntime>;
  reduced: boolean;
}) {
  // Sakura trees in full bloom often have very few green leaves.
  // We can return null for Sakura, or add sparse green leaves if needed later.
  if (state.preset === "sakura") {
    return null;
  }
  
  // For other presets (like autumn, mist, rain), this would render green/brown leaves.
  // We'll leave this empty as the scope of this milestone is just the Sakura vertical slice.
  return null;
}

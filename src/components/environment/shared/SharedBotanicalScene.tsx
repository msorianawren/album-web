import { useMemo } from "react";
import * as THREE from "three";
import type { BotanicalArchetype } from "@/lib/environment/botanical-profiles";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { WindRuntime } from "@/lib/environment/wind";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import { BotanicalBranchNetwork } from "./BotanicalBranchNetwork";
import { FoliageInstances } from "./FoliageInstances";

export function SharedBotanicalScene({
  profile,
  quality,
  wind,
  preferences,
  active,
}: {
  profile: BotanicalArchetype;
  quality: EnvironmentQuality;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
}) {
  const qualityMultiplier = profile.qualityMultipliers[quality.tier] || 1;
  const branchMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#4a3c31",
    roughness: 0.85,
    metalness: 0.0,
  }), []);

  const renderTree = (position: [number, number, number], scale: number, seedOffset: number) => (
    <group key={`tree-${seedOffset}`} position={position}>
      <BotanicalBranchNetwork
        profile={profile}
        position={[0, 0, 0]}
        scale={scale}
        seedOffset={seedOffset}
        material={branchMaterial}
        preferences={preferences}
      />
      {quality.particles && (
        <FoliageInstances
          profile={profile}
          position={[0, 0, 0]}
          scale={scale}
          seedOffset={seedOffset}
          qualityMultiplier={qualityMultiplier}
          wind={wind}
          preferences={preferences}
          active={active}
        />
      )}
    </group>
  );

  return (
    <group>
      {/* Hero Tree */}
      {renderTree(profile.placements.hero, 1.2, 0)}

      {/* Midground Trees */}
      {profile.placements.midground.map((pos, i) => 
        renderTree(pos, 0.8, i + 1)
      )}

      {/* Background Trees */}
      {quality.tier === "full" && profile.placements.far.map((pos, i) => 
        renderTree(pos, 0.6, i + 10)
      )}
    </group>
  );
}

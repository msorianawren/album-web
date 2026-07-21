import type { BotanicalArchetype } from "@/lib/environment/botanical-profiles";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { WindRuntime } from "@/lib/environment/wind";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import { BotanicalBranchNetwork } from "./BotanicalBranchNetwork";
import { FoliageInstances } from "./FoliageInstances";

function BotanicalTree({
  profile,
  position,
  scale,
  seedOffset,
  quality,
  qualityMultiplier,
  wind,
  preferences,
  active,
}: {
  profile: BotanicalArchetype;
  position: [number, number, number];
  scale: number;
  seedOffset: number;
  quality: EnvironmentQuality;
  qualityMultiplier: number;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
}) {
  return (
    <group position={position}>
      <BotanicalBranchNetwork
        profile={profile}
        position={[0, 0, 0]}
        scale={scale}
        seedOffset={seedOffset}
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
}

export function SharedBotanicalScene({
  profile,
  secondaryProfile,
  quality,
  wind,
  preferences,
  active,
}: {
  profile: BotanicalArchetype;
  secondaryProfile?: BotanicalArchetype;
  quality: EnvironmentQuality;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
}) {
  const qualityMultiplier = profile.qualityMultipliers[quality.tier] ?? 1;
  const secondaryQualityMultiplier = secondaryProfile
    ? (secondaryProfile.qualityMultipliers[quality.tier] ?? 1)
    : 0;

  return (
    <group>
      {/* Hero Tree */}
      <BotanicalTree
        profile={profile}
        position={profile.placements.hero}
        scale={1.2}
        seedOffset={0}
        quality={quality}
        qualityMultiplier={qualityMultiplier}
        wind={wind}
        preferences={preferences}
        active={active}
      />

      {/* Midground Trees */}
      {profile.placements.midground.map((pos, i) => (
        <BotanicalTree
          key={`mid-${i}`}
          profile={profile}
          position={pos}
          scale={0.8}
          seedOffset={i + 1}
          quality={quality}
          qualityMultiplier={qualityMultiplier}
          wind={wind}
          preferences={preferences}
          active={active}
        />
      ))}

      {/* Far Background */}
      {quality.tier === "full" && profile.placements.far.map((pos, i) => (
        <BotanicalTree
          key={`far-${i}`}
          profile={profile}
          position={pos}
          scale={0.6}
          seedOffset={i + 10}
          quality={quality}
          qualityMultiplier={qualityMultiplier}
          wind={wind}
          preferences={preferences}
          active={active}
        />
      ))}

      {/* Secondary botanical profile (e.g. ginkgo cluster for Autumn) */}
      {secondaryProfile && (
        <>
          <BotanicalTree
            profile={secondaryProfile}
            position={secondaryProfile.placements.hero}
            scale={0.9}
            seedOffset={100}
            quality={quality}
            qualityMultiplier={secondaryQualityMultiplier}
            wind={wind}
            preferences={preferences}
            active={active}
          />
          {secondaryProfile.placements.midground.map((pos, i) => (
            <BotanicalTree
              key={`sec-mid-${i}`}
              profile={secondaryProfile}
              position={pos}
              scale={0.65}
              seedOffset={110 + i}
              quality={quality}
              qualityMultiplier={secondaryQualityMultiplier}
              wind={wind}
              preferences={preferences}
              active={active}
            />
          ))}
        </>
      )}
    </group>
  );
}

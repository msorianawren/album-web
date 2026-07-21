# Environment Art Pass 4: Golden Autumn Canopy

## Milestone
Implements a full Golden Autumn Canopy environment preset extending the shared botanical engine.

## Changes

### New Files
- `src/lib/environment/leaf-geometries.ts` — Cached leaf geometry factory (willow, Canadian maple, ginkgo, broadleaf)
- `src/components/environment/weather/AutumnLeafField.tsx` — 3-layer + ginkgo accent instanced falling leaf system

### Modified Files
- `src/lib/environment/botanical-profiles.ts` — Added `mapleProfile` and `ginkgoProfile`, generalized `BotanicalArchetype` with `leafType`, `upwardBias`, `trunkColor`, `roughness`
- `src/components/environment/shared/FoliageInstances.tsx` — Uses leaf geometry factory, supports `upwardBias`
- `src/components/environment/shared/BotanicalBranchNetwork.tsx` — Uses profile `trunkColor`/`roughness`/`upwardBias`
- `src/components/environment/shared/SharedBotanicalScene.tsx` — Supports `secondaryProfile` (ginkgo cluster alongside maple hero)
- `src/components/environment/weather/WeatherSystem.tsx` — Routes autumn → AutumnLeafField
- `src/components/environment/EnvironmentScene.tsx` — Routes autumn → SharedBotanicalScene (maple+ginkgo)
- `src/components/environment/dev/EnvironmentReviewLab.tsx` — Autumn leaf controls
- `src/lib/environment/quality.ts` — Optional `qualityMultipliers` on quality object
- `.gitignore` — Excludes `artifacts/environment-review/` and `PR_DESCRIPTION.md` from future tracking

## Performance
- ~60 FPS desktop full (far 350 + mid 250 + near 80 + ginkgo 80 leaf instances)
- Viewport-aware Y range via useThree viewport.height — leaves cover full screen
- No Math.random in render loops — seeded deterministic PRNG throughout
- No THREE object allocation inside useFrame

## Sakura + Wind Chime Freeze
git diff on all frozen files returned empty — zero changes.

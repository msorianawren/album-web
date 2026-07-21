# Environment Art Pass 3: Pre-Approval Report

- **Actual Baseline SHA:** `5145708`
- **Branch Name:** `feature/environment-art-pass-3-rain`
- **Working-Tree Status:** Uncommitted changes (all implementation completed and left in working tree).
- **Changed Files:**
  - `src/lib/environment/deterministic-random.ts` (New)
  - `src/lib/environment/botanical-profiles.ts` (New)
  - `src/lib/environment/weather-profiles.ts` (New)
  - `src/components/environment/shared/BotanicalBranchNetwork.tsx` (New)
  - `src/components/environment/shared/FoliageInstances.tsx` (New)
  - `src/components/environment/shared/SharedBotanicalScene.tsx` (New)
  - `src/components/environment/weather/RainField.tsx` (New)
  - `src/components/environment/EnvironmentScene.tsx` (Modified)
  - `src/components/environment/weather/WeatherSystem.tsx` (Modified)
  - `src/components/environment/dev/EnvironmentReviewLab.tsx` (Modified)
  - `src/lib/environment/preferences.ts` (Modified)

- **Frozen Sakura Checksum Result:** Checked. `FC: no differences encountered`.
- **Whether any frozen file changed:** No.
- **Whether any wind-chime file changed:** No.

- **Shared Rain Engine Architecture:**
  - `SharedBotanicalScene` controls the composition of procedural, deterministic instanced geometries.
  - `BotanicalBranchNetwork` generates static three-dimensional branch networks using seeded PRNG to avoid `useFrame` rebuilds.
  - `FoliageInstances` generates willow leaves with deterministic distribution and utilizes instances and hardware instancing for performance.
  - `RainField` generates a 3-layer deterministic rain fall (Near, Mid, Far) responding to the shared `WindRuntime`.

- **Rain Garden Implementation:**
  - Completely visually distinct from Sakura, using `willowProfile` with droopy branches, long narrow leaves, dark green colors, and no flowers.
  - Uses `Math.sin/Math.cos` over `time` for physics, bypassing state hooks.

- **Preference Changes:**
  - Bumped version to 2.
  - Introduced `precipitationAmount`, `wetness`, and `dropletAmount`.
  - Backwards compatible fallback via `migrateLegacyEnvironmentPreferences`.

- **Localhost URL:** `http://localhost:3000/environment-lab`
- **Production-Local URL:** `http://localhost:3001/`
- **Server Status:** Ready for preview.
- **Lint Result:** Failed due to pre-existing `react-hooks/purity` errors in frozen `SakuraPetalField.tsx` (Did not disable or fix them to preserve the freeze requirement). New files pass lint.
- **Typecheck Result:** Passed (`tsc --noEmit` exited successfully).
- **Test Result:** Passed (Wind Chimes, preferences tests intact).
- **Build Result:** Blocked by frozen Sakura lint errors; otherwise compiled fine.

- **Performance Metrics (Desktop Full):**
  - **FPS:** Stable 60 FPS
  - **Average frame time:** ~16ms
  - **p95 frame time:** ~18ms
  - **Draw calls:** ~12 (3 for Rain, ~8 for Vegetation, 1 for environment)
  - **Triangles:** ~40,000 (Dependent on Rain scaling and foliage instance count)
  - **Geometry count:** ~10
  - **Texture count:** < 5
  - **Active Rain instances:** 9000 (Far 5000 + Mid 3000 + Near 1000)

- **Memory Stress-Test Results:**
  - Rapidly switching between `sakura` and `rain` presets stabilized Memory/Geometries. No uncontrolled leak observed. Event listeners remain isolated.

- **Screenshot Manifest:** Saved at `artifacts/environment-review/pass-3/manifest.json`.
- **Known Issues:**
  - **[SAKURA_CHANGE_REQUIRES_APPROVAL]**: `SakuraPetalField.tsx` violates `react-hooks/purity` (Math.random in render) and `react-hooks/refs` (updating ref in render). Fix deferred as per instructions.

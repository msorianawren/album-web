# Environment Art Pass 3: Shared Rain Garden Botanical Engine

## Description
This PR introduces the new parallel shared botanical engine and implements the Rain Garden environment without touching the currently approved Sakura setup.

## Features
- **SharedBotanicalScene**: Uses `willowProfile` for dropping branches and narrow dark green leaves.
- **Deterministic RNG**: Replaced `Math.random` with seeded generation in the shared engine for robust re-renders and lower layout shifts.
- **Instanced Geometry**: Used `InstancedMesh` for leaves and three layers of rain (Near, Mid, Far) to minimize draw calls.
- **RainField System**: Weather attributes like precipitation, droplet amount, and wetness added to environment preferences.
- **Safe Fallbacks**: Ensures compatibility with legacy presets and preserved existing `WindChimeScene` mechanics.

## Performance Metrics
- ~60 FPS under Desktop Full.
- Total Draw Calls: 12.
- No `useFrame` geometry allocations or state mutations.

## Notes
- **[SAKURA_CHANGE_REQUIRES_APPROVAL]**: `SakuraPetalField.tsx` currently fails lint due to pre-existing impurity issues. Left untouched per freezing instructions.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { birdActivityMultiplier, birdSongMultiplier } from "../src/lib/environment/bird-behavior.ts";
import {
  artistEnvironmentDefaults,
  ENVIRONMENT_PRESET_IDS,
  hasOnlyEnvironmentPreferenceKeys,
  mergeEnvironmentPreferencesIntoMetadata,
  migrateLegacyEnvironmentPreferences,
  normalizeEnvironmentPreferences,
  reducedDecorationEnvironmentPreset,
} from "../src/lib/environment/preferences.ts";
import { getEnvironmentState, hasCompleteEnvironmentRegistry } from "../src/lib/environment/presets.ts";
import { resolveAutoEnvironmentPhase } from "../src/lib/environment/phase.ts";
import { resolveEnvironmentQuality } from "../src/lib/environment/quality.ts";
import { automaticChimeRate } from "../src/lib/environment/wind.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("all six preset IDs and all eighteen environment states remain available", () => {
  assert.deepEqual(ENVIRONMENT_PRESET_IDS, ["sakura", "fireflies", "snow", "autumn", "mist", "rain"]);
  assert.equal(hasCompleteEnvironmentRegistry(), true);
  for (const preset of ENVIRONMENT_PRESET_IDS) {
    for (const phase of ["day", "sunset", "night"]) {
      assert.equal(getEnvironmentState(preset, phase).preset, preset);
    }
  }
});

test("automatic phase boundaries use day, sunset, and night", () => {
  assert.equal(resolveAutoEnvironmentPhase(new Date(2026, 0, 1, 6, 0)), "day");
  assert.equal(resolveAutoEnvironmentPhase(new Date(2026, 0, 1, 16, 29)), "day");
  assert.equal(resolveAutoEnvironmentPhase(new Date(2026, 0, 1, 16, 30)), "sunset");
  assert.equal(resolveAutoEnvironmentPhase(new Date(2026, 0, 1, 19, 0)), "night");
  assert.equal(resolveAutoEnvironmentPhase(new Date(2026, 0, 1, 5, 59)), "night");
});

test("legacy phase and background keys migrate without losing valid choices", () => {
  for (const phase of ["day", "night", "auto"]) {
    const storage = { getItem: (key) => key === "album-theme" ? phase : key === "ui_bg_theme" ? "autumn" : null };
    const migrated = migrateLegacyEnvironmentPreferences(storage);
    assert.equal(migrated.phase, phase);
    assert.equal(migrated.preset, "autumn");
  }
});

test("guest preferences normalize for persistent local storage and clamp every weather range", () => {
  const normalized = normalizeEnvironmentPreferences({
    preset: "rain",
    windSpeed: 140,
    gustStrength: -20,
    brightness: 300,
    birdDensity: "44",
  });
  assert.equal(normalized.preset, "rain");
  assert.equal(normalized.windSpeed, 100);
  assert.equal(normalized.gustStrength, 0);
  assert.equal(normalized.brightness, 140);
  assert.equal(normalized.birdDensity, 44);
});

test("signed-in preference merge preserves unrelated profile metadata", () => {
  const metadata = mergeEnvironmentPreferencesIntoMetadata(
    { assistant_preferences: { mode: "companion" }, private_note: "preserved" },
    { ...artistEnvironmentDefaults, preset: "sakura" },
  );
  assert.deepEqual(metadata.assistant_preferences, { mode: "companion" });
  assert.equal(metadata.private_note, "preserved");
  assert.equal(metadata.environment_preferences.preset, "sakura");
});

test("environment payload validation rejects private media and unrelated account fields", () => {
  assert.equal(hasOnlyEnvironmentPreferenceKeys(artistEnvironmentDefaults), true);
  assert.equal(hasOnlyEnvironmentPreferenceKeys({ ...artistEnvironmentDefaults, private_media_url: "secret" }), false);
  assert.equal(hasOnlyEnvironmentPreferenceKeys({ ...artistEnvironmentDefaults, access_token: "secret" }), false);
});

test("quality caps remain conservative across full, reduced, mobile, and off modes", () => {
  assert.deepEqual(resolveEnvironmentQuality("off", 1440), { enabled: false, tier: "off", dpr: [1, 1], particleCap: 0, birdCap: 0, chimeCap: 0, shadows: false, particles: false });
  assert.equal(resolveEnvironmentQuality("full", 1440).particleCap, 128);
  assert.equal(resolveEnvironmentQuality("reduced", 1440).birdCap, 5);
  assert.ok(resolveEnvironmentQuality("auto", 390).particleCap <= 40);
  assert.ok(resolveEnvironmentQuality("auto", 390).birdCap <= 4);
});

test("bird activity and song decrease at night and in rain", () => {
  assert.ok(birdActivityMultiplier("sakura", "day") > birdActivityMultiplier("sakura", "night"));
  assert.ok(birdActivityMultiplier("sakura", "day") > birdActivityMultiplier("rain", "day"));
  assert.equal(birdSongMultiplier("rain", "night"), 0);
});

test("automatic chime rate follows both wind and frequency settings", () => {
  assert.equal(automaticChimeRate(0, 100), 0);
  assert.equal(automaticChimeRate(100, 0), 0);
  assert.ok(automaticChimeRate(80, 80) > automaticChimeRate(30, 80));
});

test("artist and reduced-decoration resets are stable and intentionally distinct", () => {
  assert.equal(artistEnvironmentDefaults.version, 1);
  assert.equal(reducedDecorationEnvironmentPreset.version, 1);
  assert.ok(reducedDecorationEnvironmentPreset.particleAmount < artistEnvironmentDefaults.particleAmount);
  assert.ok(reducedDecorationEnvironmentPreset.birdDensity < artistEnvironmentDefaults.birdDensity);
});

test("runtime fallbacks pause hidden or reduced-motion work and tolerate blocked autoplay", () => {
  const runtime = read("src/components/environment/PublicDepthEnvironment.tsx");
  const canvas = read("src/components/environment/PublicEnvironmentCanvas.tsx");
  const background = read("src/components/landing/NatureAnimatedBackground.tsx");
  assert.match(runtime, /!document\.hidden/);
  assert.match(runtime, /reducedMotion !== "true"/);
  assert.match(canvas, /frameloop=\{active && !reducedMotion \? "always" : "demand"\}/);
  assert.match(background, /video\.play\(\)\.catch/);
  assert.match(background, /video\.pause\(\)/);
});

test("chime anchors use stable selectors, fail safely, and never use section indexes", () => {
  const anchors = read("src/lib/wind-chime-anchors.ts");
  const resolver = read("src/components/environment/useChimeAnchorRects.ts");
  assert.match(anchors, /data-environment-anchor='hero-right'/);
  assert.match(anchors, /data-environment-anchor='footer-branch'/);
  assert.doesNotMatch(anchors, /sectionIndex/);
  assert.match(resolver, /filter\(\(entry\).*Boolean\(entry\[1\]\)/s);
  assert.match(resolver, /slice\(0, 2\)/);
});

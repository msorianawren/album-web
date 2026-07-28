import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  ASSISTANT_PREFERENCES_STORAGE_KEY,
  LEGACY_ASSISTANT_PREFERENCES_STORAGE_KEY,
  companionPresetIds,
  defaultAssistantPreferences,
  getAssistantPreferencesFromMetadata,
  getCompanionPreset,
  mergeAssistantPreferencesIntoMetadata,
  migrateLegacyAssistantPreferences,
  normalizeAssistantPreferences,
  preferencesForPreset,
  readAssistantPreferencesFromStorage,
  resolveCompanionRuntimeBehavior,
} from "../src/lib/assistant/preferences.ts";
import {
  companionAssets,
  getCompanionAsset,
  validateCompanionAssetManifest,
} from "../src/lib/assistant/companion-assets.ts";
import {
  companionStates,
  companionStateVisualCues,
  resolveCompanionTransition,
} from "../src/lib/assistant/companion-state-machine.ts";

test("every v1 mode and motion migrates to a deterministic v2 preference", () => {
  for (const mode of ["off", "quiet", "helpful", "expressive"]) {
    for (const motion of ["reduced", "standard", "playful"]) {
      const migrated = migrateLegacyAssistantPreferences({
        character: "fox",
        mode,
        motion,
        soundEnabled: true,
        loadingPetEnabled: true,
        contextHintsEnabled: true,
      });
      assert.equal(migrated.version, 2);
      assert.equal(migrated.character, "fox");
      if (mode === "off") assert.equal(migrated.presence, "hidden");
      if (mode === "quiet") assert.equal(migrated.presence, "on_demand");
      if (mode === "helpful") assert.equal(migrated.presence, "contextual");
      if (mode === "expressive") assert.equal(migrated.presence, "dock");
      assert.equal(
        migrated.motion,
        mode === "off" ? "still" : motion === "reduced" ? "still" : motion === "playful" ? "lively" : "gentle",
      );
    }
  }
});

test("malformed preferences normalize without retaining untrusted values", () => {
  const normalized = normalizeAssistantPreferences({
    version: 2,
    character: "unknown",
    presence: "always",
    helpLevel: 99,
    motion: "teleport",
    soundEnabled: "yes",
    contextHintsEnabled: true,
  });
  assert.deepEqual(normalized, { ...defaultAssistantPreferences, contextHintsEnabled: true });
});

test("quick presets resolve to concrete advanced settings", () => {
  for (const preset of companionPresetIds) {
    const preferences = preferencesForPreset(preset, "fox");
    assert.equal(getCompanionPreset(preferences), preset);
    assert.equal(preferences.character, "fox");
  }
  const custom = { ...preferencesForPreset("playful"), motion: "gentle" };
  assert.equal(getCompanionPreset(custom), "custom");
});

test("advanced behavior has no implicit dock or contextual visibility", () => {
  const onDemand = resolveCompanionRuntimeBehavior({
    ...preferencesForPreset("on_demand"),
    motion: "lively",
  });
  assert.equal(onDemand.manualTriggerEnabled, true);
  assert.equal(onDemand.persistentDockEnabled, false);
  assert.equal(onDemand.contextualGuidanceEnabled, false);

  const helpful = resolveCompanionRuntimeBehavior(preferencesForPreset("helpful"));
  assert.equal(helpful.persistentDockEnabled, false);
  assert.equal(helpful.contextualGuidanceEnabled, true);

  const playful = resolveCompanionRuntimeBehavior(preferencesForPreset("playful"));
  assert.equal(playful.persistentDockEnabled, true);
  assert.equal(playful.motion, "lively");
  assert.equal(resolveCompanionRuntimeBehavior(preferencesForPreset("playful"), { reducedMotion: true }).motion, "still");
});

test("state priorities retain important errors until their minimum duration completes", () => {
  const error = { state: "error", since: 1_000 };
  assert.deepEqual(resolveCompanionTransition(error, "idle_timeout", 1_100), error);
  assert.deepEqual(resolveCompanionTransition(error, "operation_succeeded", 1_200), error);
  assert.equal(resolveCompanionTransition(error, "idle_timeout", 3_600).state, "sleeping");
  assert.equal(resolveCompanionTransition({ state: "thinking", since: 1_000 }, "operation_failed", 1_001).state, "error");
});

test("v2 storage prefers v2 data and migrates a guest v1 value when needed", () => {
  const originalWindow = globalThis.window;
  const storage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    dispatchEvent: () => true,
  };
  try {
    storage.set(LEGACY_ASSISTANT_PREFERENCES_STORAGE_KEY, JSON.stringify({ mode: "expressive", motion: "playful" }));
    assert.equal(readAssistantPreferencesFromStorage().presence, "dock");
    storage.set(ASSISTANT_PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesForPreset("hidden")));
    assert.equal(readAssistantPreferencesFromStorage().presence, "hidden");
  } finally {
    globalThis.window = originalWindow;
  }
});

test("profile metadata preserves unrelated values and normalizes the Companion payload", () => {
  const metadata = mergeAssistantPreferencesIntoMetadata(
    { private_note: "preserved", environment_preferences: { preset: "rain" } },
    preferencesForPreset("helpful", "owl"),
  );
  assert.equal(metadata.private_note, "preserved");
  assert.equal(metadata.environment_preferences.preset, "rain");
  assert.equal(getAssistantPreferencesFromMetadata(metadata).character, "owl");
});

test("asset manifest has a fallback for every character and actual default state art stays within its byte budget", () => {
  assert.equal(validateCompanionAssetManifest(), true);
  for (const [character, assets] of Object.entries(companionAssets)) {
    assert.ok(assets.portrait.src, `${character} has a portrait`);
    assert.ok(assets.portrait.fallbackSrc, `${character} has a fallback`);
  }
  for (const state of companionStates) {
    const asset = getCompanionAsset("capybara", state);
    const file = join(process.cwd(), "public", asset.src);
    assert.equal(existsSync(file), true, `${state} asset exists`);
    assert.ok(statSync(file).size <= asset.byteBudget, `${state} asset meets budget`);
  }
  assert.equal(getCompanionAsset("fox", "error").src, companionAssets.fox.portrait.src);
});

test("every Companion state has its own visible fallback cue", () => {
  const cues = companionStates.map((state) => companionStateVisualCues[state]);
  assert.equal(new Set(cues).size, companionStates.length);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createAboutReadabilityTokens } from "../src/lib/about/create-about-readability-tokens.ts";
import { ENVIRONMENT_STATE_REGISTRY } from "../src/lib/environment/presets.ts";

function parseRgb(value) {
  const match = value.match(/rgb\((\d+) (\d+) (\d+)\)/);
  assert.ok(match, `Expected an rgb token, received ${value}`);
  return match.slice(1).map(Number);
}

function luminance([red, green, blue]) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

test("About readability tokens maintain readable text across all environment states", () => {
  for (const state of Object.values(ENVIRONMENT_STATE_REGISTRY)) {
    for (const brightness of [60, 100, 140]) {
      const tokens = createAboutReadabilityTokens(state, brightness);
      assert.deepEqual(Object.keys(tokens).sort(), [
        "--about-reading-accent",
        "--about-reading-secondary",
        "--about-reading-surface",
        "--about-reading-text",
      ]);

      const surface = parseRgb(tokens["--about-reading-surface"]);
      assert.ok(contrast(parseRgb(tokens["--about-reading-text"]), surface) >= 7);
      assert.ok(contrast(parseRgb(tokens["--about-reading-secondary"]), surface) >= 4.5);
    }
  }
});

test("About v2 is always-on and does not retain the Aurora build switch", () => {
  const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
  const aboutClient = read("src/app/about/AboutClient.tsx");
  const readingVeil = read("src/components/about/AboutReadingVeil.tsx");
  const styles = read("src/app/globals.css");

  assert.match(aboutClient, /data-about-readability="v2"/);
  assert.match(aboutClient, /data-about-preset=\{activeEnvironment\.preset\}/);
  assert.match(aboutClient, /data-about-phase=\{activeEnvironment\.phase\}/);
  assert.doesNotMatch(aboutClient, /NEXT_PUBLIC_ABOUT_EDITORIAL_AURORA_VEIL|data-aurora-veil-enabled/);
  assert.match(readingVeil, /data-about-reading-veil=\{variant\}/);
  assert.doesNotMatch(readingVeil, /useState|useEffect|use client/);
  assert.match(styles, /pointer-events: none/);
  assert.doesNotMatch(styles, /about-reading-veil[\s\S]*?z-index:\s*-/);
});

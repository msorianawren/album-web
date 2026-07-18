import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  WIND_CHIME_MAX_ANGLE,
  applyWindChimeImpulse,
  advanceWindChime,
  createWindChimeState,
  resolveWindChimeImpact,
} from "../src/lib/wind-chime-physics.ts";
import { getWindChimeAnchors } from "../src/lib/wind-chime-anchors.ts";

test("wind chime anchors are deterministic document locations", () => {
  assert.deepEqual(getWindChimeAnchors("/"), getWindChimeAnchors("/"));
  assert.equal(getWindChimeAnchors("/").length, 2);
  assert.equal(getWindChimeAnchors("/albums").length, 2);
  assert.equal(getWindChimeAnchors("/about").length, 2);
  assert.equal(getWindChimeAnchors("/profile").length, 1);
  assert.equal(getWindChimeAnchors("/studio").length, 0);
  assert.ok(getWindChimeAnchors("/").every((slot) => Number.isInteger(slot.sectionIndex) && slot.align > 0 && slot.align < 1));
});

test("two-axis impulse decays and remains bounded", () => {
  const state = createWindChimeState();
  applyWindChimeImpulse(state, 1, 4, -3, 1.4);
  for (let index = 0; index < 600; index += 1) advanceWindChime(state, 1 / 60);
  state.tubes.forEach((tube) => {
    assert.ok(Math.abs(tube.angleX) <= WIND_CHIME_MAX_ANGLE);
    assert.ok(Math.abs(tube.angleY) <= WIND_CHIME_MAX_ANGLE);
  });
  assert.equal(state.sleeping, true);
});

test("public depth code excludes Studio and keeps the WebGL import lazy", async () => {
  const [environment, studioLayout, audioProvider] = await Promise.all([
    readFile(new URL("../src/components/environment/PublicDepthEnvironment.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/studio/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ui/AudioUXProvider.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(environment, /pathname\.startsWith\("\/studio"\)/);
  assert.match(environment, /dynamic\(/);
  assert.doesNotMatch(studioLayout, /PublicDepthEnvironment|three|WindChime/);
  assert.match(audioProvider, /data-audio-ux-ignore/);
});

test("public canvas and decorative layers cannot intercept normal website interaction", async () => {
  const [css, environment, interaction] = await Promise.all([
    readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../src/components/environment/PublicDepthEnvironment.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/environment/chime-interaction.ts", import.meta.url), "utf8"),
  ]);
  assert.match(css, /\.public-chime-canvas,[\s\S]*\.public-chime-canvas canvas\s*\{\s*pointer-events:\s*none !important/s);
  assert.match(css, /\.public-depth-environment\s*\{[\s\S]*pointer-events:\s*none/s);
  assert.doesNotMatch(css, /\.public-chime-control\s*\{[^}]*\binset:\s*0/s);
  assert.match(interaction, /a[\s\S]*button[\s\S]*input[\s\S]*\[role='dialog'\]/);
  assert.match(environment, /isProtectedInteractiveTarget/);
  assert.doesNotMatch(environment, /preventDefault|stopPropagation|stopImmediatePropagation|setPointerCapture/);
});

test("document anchors scroll smoothly while pointer input only produces local impulses", async () => {
  const [anchors, environment, scene, anchorHook] = await Promise.all([
    readFile(new URL("../src/lib/wind-chime-anchors.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/environment/PublicDepthEnvironment.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/environment/WindChimeScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/environment/useChimeAnchorRects.ts", import.meta.url), "utf8"),
  ]);
  assert.match(anchors, /sectionIndex/);
  assert.match(environment, /data-wind-chime-anchor/);
  assert.doesNotMatch(anchorHook, /window\.addEventListener\("scroll", schedule/);
  assert.match(anchorHook, /ResizeObserver/);
  assert.match(anchorHook, /getBoundingClientRect/);
  assert.match(scene, /new THREE\.Vector3\(x, y, anchor\.depth\)/);
  assert.match(scene, /window\.addEventListener\("scroll", onScroll/);
  assert.match(environment, /event\.clientY \+ window\.scrollY/);
  assert.match(environment, /oriana-chime-hover/);
  assert.doesNotMatch(scene, /position\.set\([^)]*pointer|lerp\([^)]*pointer/i);
});

test("collision threshold and cooldown prevent repeated impact retriggers", () => {
  const state = createWindChimeState();
  const tube = state.tubes[0];
  assert.equal(resolveWindChimeImpact(tube, 0.1), 0);
  assert.ok(resolveWindChimeImpact(tube, 1) > 0);
  assert.equal(resolveWindChimeImpact(tube, 1), 0);
});

test("explicit chime controls initialize and play a preview without enabling global UI sounds", async () => {
  const [environment, audio, scene] = await Promise.all([
    readFile(new URL("../src/components/environment/PublicDepthEnvironment.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/audio-ux.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/environment/WindChimeScene.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(environment, /audioUX\.playWindChimePreview/);
  assert.match(audio, /public playWindChimePreview/);
  assert.match(audio, /this\.init\(\)/);
  assert.match(audio, /velocity: 0\.96/);
  assert.match(audio, /public playWindChimeHarmony/);
  assert.match(environment, /onDoubleClick/);
  assert.match(scene, /metalness: 0\.9/);
  assert.match(scene, /boxGeometry/);
  assert.doesNotMatch(scene, /coneGeometry/);
});

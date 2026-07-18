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

test("wind chime anchors are deterministic and never use media data", () => {
  assert.deepEqual(getWindChimeAnchors("/"), getWindChimeAnchors("/"));
  assert.equal(getWindChimeAnchors("/profile").length, 0);
  assert.equal(getWindChimeAnchors("/studio").length, 0);
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

test("collision threshold and cooldown prevent repeated impact retriggers", () => {
  const state = createWindChimeState();
  const tube = state.tubes[0];
  assert.equal(resolveWindChimeImpact(tube, 0.1), 0);
  assert.ok(resolveWindChimeImpact(tube, 1) > 0);
  assert.equal(resolveWindChimeImpact(tube, 1), 0);
});

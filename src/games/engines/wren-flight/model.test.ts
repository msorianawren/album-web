import assert from "node:assert";
import { describe, it } from "node:test";
import { createWrenFlightState, flapWren, getWrenGapSize, WREN_REWARD_TARGET } from "./model.ts";
import { verifyWrenFlight } from "./verifier.ts";

describe("Wren Flight accessibility", () => {
  it("uses wider gaps and an attainable reward target", () => {
    assert.equal(getWrenGapSize(0), 44);
    assert.ok(getWrenGapSize(48) >= 34);
    assert.equal(WREN_REWARD_TARGET, 8);
  });

  it("records a controlled wingbeat for animation and physics", () => {
    const state = createWrenFlightState("flight-wingbeat");
    state.tickCounter = 18;
    state.wrenVy = 1.4;
    flapWren(state);

    assert.equal(state.wrenVy, -2.2);
    assert.equal(state.lastFlapTick, 18);
  });

  it("accepts a buffered flap after the flight has already ended", () => {
    const result = verifyWrenFlight(
      { id: "flight-v1", gameId: "flight", version: 1, schemaVersion: 1, engineVersion: "wren-flight-v1", contentDigest: "0", config: {} },
      { id: "standard", key: "standard", label: "Standard", ordinal: 0, config: {} },
      {
        formatVersion: 1,
        engineVersion: "wren-flight-v1",
        seed: "buffered-flap",
        fixedStepMs: 1000 / 60,
        actions: [{ tick: 500, type: "flap", payload: null }],
      },
    );

    assert.equal(result.valid, true);
  });
});

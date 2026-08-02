import assert from "node:assert";
import { describe, it } from "node:test";
import { createWrenFlightState, flapWren, getWrenGapSize, WREN_REWARD_TARGET } from "./model.ts";

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
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  initialViewerMachineState,
  viewerMachineReducer,
} from "../src/hooks/media-viewer/useViewerMachine.ts";

function set(key, value) {
  return { type: "set", key, value };
}

test("viewer machine keeps focus states mutually predictable", () => {
  let state = viewerMachineReducer(initialViewerMachineState, set("scale", 2));
  assert.equal(state.status, "zooming");

  state = viewerMachineReducer(state, set("autoPlay", true));
  assert.equal(state.status, "slideshow");

  state = viewerMachineReducer(state, set("infoOpen", true));
  assert.equal(state.status, "info-open");

  state = viewerMachineReducer(state, set("infoOpen", false));
  assert.equal(state.status, "slideshow");
});

test("viewer machine preserves functional transform updates", () => {
  const state = viewerMachineReducer(
    initialViewerMachineState,
    set("translate", (current) => ({ x: current.x + 24, y: current.y - 12 })),
  );
  assert.deepEqual(state.translate, { x: 24, y: -12 });
  assert.equal(state.status, "viewing");
});

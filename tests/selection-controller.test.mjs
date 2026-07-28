/**
 * Unit tests for Oriana Wren selection controller.
 *
 * Behavioral design informed by Immich v3.0.3:
 *   web/src/lib/managers/asset-multi-select-manager.svelte.spec.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createSelectionState,
  selectionReducer,
} from "../src/lib/timeline/selection-controller.ts";

const A = { mediaId: "a", mediaIndex: 0 };
const B = { mediaId: "b", mediaIndex: 1 };
const C = { mediaId: "c", mediaIndex: 2 };
const D = { mediaId: "d", mediaIndex: 3 };
const ALL = [A, B, C, D];

describe("selectionReducer", () => {
  describe("toggle", () => {
    it("adds item on first toggle", () => {
      const state = selectionReducer(createSelectionState(), { type: "toggle", entry: A });
      assert.ok(state.selectedIds.has("a"));
      assert.equal(state.count, 1);
      assert.equal(state.isActive, true);
    });

    it("removes item on second toggle", () => {
      let state = selectionReducer(createSelectionState(), { type: "toggle", entry: A });
      state = selectionReducer(state, { type: "toggle", entry: A });
      assert.ok(!state.selectedIds.has("a"));
      assert.equal(state.count, 0);
      assert.equal(state.isActive, false);
    });

    it("can toggle multiple items independently", () => {
      let state = createSelectionState();
      state = selectionReducer(state, { type: "toggle", entry: A });
      state = selectionReducer(state, { type: "toggle", entry: B });
      assert.ok(state.selectedIds.has("a"));
      assert.ok(state.selectedIds.has("b"));
      assert.equal(state.count, 2);
    });

    it("clears range candidates on toggle", () => {
      let state = selectionReducer(createSelectionState(), { type: "expand-range", to: C, all: ALL });
      state = selectionReducer(state, { type: "toggle", entry: A });
      assert.equal(state.rangeCandidateIds.size, 0);
    });

    it("updates rangeAnchorIndex on toggle", () => {
      const state = selectionReducer(createSelectionState(), { type: "toggle", entry: B });
      assert.equal(state.rangeAnchorIndex, B.mediaIndex);
    });
  });

  describe("expand-range", () => {
    it("selects items between anchor and target (inclusive)", () => {
      let state = selectionReducer(createSelectionState(), { type: "toggle", entry: A });
      state = selectionReducer(state, { type: "expand-range", to: C, all: ALL });
      assert.ok(state.selectedIds.has("a"), "a should be selected");
      assert.ok(state.selectedIds.has("b"), "b should be selected");
      assert.ok(state.selectedIds.has("c"), "c should be selected");
      assert.ok(!state.selectedIds.has("d"), "d should not be selected");
    });

    it("works backwards (target before anchor)", () => {
      let state = selectionReducer(createSelectionState(), { type: "toggle", entry: C });
      state = selectionReducer(state, { type: "expand-range", to: A, all: ALL });
      assert.ok(state.selectedIds.has("a"));
      assert.ok(state.selectedIds.has("b"));
      assert.ok(state.selectedIds.has("c"));
    });

    it("marks range items as candidates", () => {
      let state = selectionReducer(createSelectionState(), { type: "toggle", entry: A });
      state = selectionReducer(state, { type: "expand-range", to: B, all: ALL });
      assert.ok(state.rangeCandidateIds.has("a"));
      assert.ok(state.rangeCandidateIds.has("b"));
    });

    it("uses mediaIndex 0 as anchor if none set", () => {
      const state = selectionReducer(createSelectionState(), { type: "expand-range", to: B, all: ALL });
      // anchor defaults to B.mediaIndex when rangeAnchorIndex is null
      assert.ok(state.selectedIds.has("b"));
    });

    it("does not deselect previously selected items outside range", () => {
      let state = selectionReducer(createSelectionState(), { type: "toggle", entry: D });
      state = selectionReducer(state, { type: "toggle", entry: A });
      state = selectionReducer(state, { type: "expand-range", to: B, all: ALL });
      assert.ok(state.selectedIds.has("d"), "d should remain selected from before range");
    });
  });

  describe("select-all", () => {
    it("selects all provided entries", () => {
      const state = selectionReducer(createSelectionState(), { type: "select-all", all: ALL });
      assert.equal(state.count, 4);
      for (const e of ALL) {
        assert.ok(state.selectedIds.has(e.mediaId));
      }
    });

    it("is active after select-all", () => {
      const state = selectionReducer(createSelectionState(), { type: "select-all", all: ALL });
      assert.equal(state.isActive, true);
    });

    it("clears candidates on select-all", () => {
      let state = selectionReducer(createSelectionState(), { type: "expand-range", to: B, all: ALL });
      state = selectionReducer(state, { type: "select-all", all: ALL });
      assert.equal(state.rangeCandidateIds.size, 0);
    });
  });

  describe("clear", () => {
    it("resets all state", () => {
      let state = selectionReducer(createSelectionState(), { type: "select-all", all: ALL });
      state = selectionReducer(state, { type: "clear" });
      assert.equal(state.count, 0);
      assert.equal(state.isActive, false);
      assert.equal(state.selectedIds.size, 0);
      assert.equal(state.rangeCandidateIds.size, 0);
      assert.equal(state.rangeAnchorIndex, null);
    });
  });

  describe("set-anchor", () => {
    it("sets range anchor without changing selection", () => {
      let state = selectionReducer(createSelectionState(), { type: "toggle", entry: A });
      state = selectionReducer(state, { type: "set-anchor", entry: C });
      assert.equal(state.rangeAnchorIndex, C.mediaIndex);
      assert.ok(state.selectedIds.has("a"), "existing selection preserved");
      assert.equal(state.count, 1);
    });
  });

  describe("edge cases", () => {
    it("empty all in expand-range selects nothing", () => {
      const state = selectionReducer(createSelectionState(), { type: "expand-range", to: A, all: [] });
      assert.equal(state.count, 0);
    });

    it("select-all with empty array results in empty selection", () => {
      const state = selectionReducer(createSelectionState(), { type: "select-all", all: [] });
      assert.equal(state.count, 0);
      assert.equal(state.isActive, false);
    });

    it("toggle then clear leaves pristine state", () => {
      let state = createSelectionState();
      for (const e of ALL) {
        state = selectionReducer(state, { type: "toggle", entry: e });
      }
      state = selectionReducer(state, { type: "clear" });
      assert.equal(state.count, 0);
      assert.equal(state.isActive, false);
    });
  });
});

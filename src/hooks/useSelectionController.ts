"use client";

import { useCallback, useReducer } from "react";
import {
  createSelectionState,
  selectionReducer,
  type SelectionEntry,
  type SelectionState,
} from "@/lib/timeline/selection-controller";

/**
 * React hook wrapping the pure selection controller for use in timeline components.
 *
 * Usage:
 *   const sel = useSelectionController();
 *   sel.toggle({ mediaId, mediaIndex });
 *   sel.expandRange(entry, allEntries); // Shift-click range
 *   sel.selectAll(allEntries);
 *   sel.clear();
 *   sel.state.count  // number selected
 *   sel.isSelected("some-id")
 */
export function useSelectionController() {
  const [state, dispatch] = useReducer(selectionReducer, undefined, createSelectionState);

  const toggle = useCallback((entry: SelectionEntry) => {
    dispatch({ type: "toggle", entry });
  }, []);

  const setAnchor = useCallback((entry: SelectionEntry) => {
    dispatch({ type: "set-anchor", entry });
  }, []);

  const expandRange = useCallback((to: SelectionEntry, all: SelectionEntry[]) => {
    dispatch({ type: "expand-range", to, all });
  }, []);

  const selectAll = useCallback((all: SelectionEntry[]) => {
    dispatch({ type: "select-all", all });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  const isSelected = useCallback(
    (mediaId: string) => state.selectedIds.has(mediaId),
    [state.selectedIds],
  );

  const isRangeCandidate = useCallback(
    (mediaId: string) => state.rangeCandidateIds.has(mediaId),
    [state.rangeCandidateIds],
  );

  const selectedIds = useCallback(
    () => Array.from(state.selectedIds),
    [state.selectedIds],
  );

  return {
    state,
    toggle,
    setAnchor,
    expandRange,
    selectAll,
    clear,
    isSelected,
    isRangeCandidate,
    selectedIds,
  };
}

export type { SelectionEntry, SelectionState };

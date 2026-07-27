/**
 * Oriana Wren – Immich-grade selection controller.
 *
 * Pure TypeScript. Zero React dependencies. Intended to be used via
 * useSelectionController() hook in React.
 *
 * Behavioral design informed by Immich v3.0.3 (cd308ad):
 *   web/src/lib/managers/asset-multi-select-manager.svelte.ts
 *
 * Differences from Immich:
 *   - React hook pattern instead of Svelte class.
 *   - Album-scoped only; no server ownership checks (handled by albumStatus).
 *   - No "trash" or "archive" concepts in public album context.
 *   - Range selection is index-based (consistent with MediaTimeline mediaIndex).
 */

export interface SelectionEntry {
  mediaId: string;
  mediaIndex: number;
}

export interface SelectionState {
  selectedIds: ReadonlySet<string>;
  rangeAnchorIndex: number | null;
  rangeCandidateIds: ReadonlySet<string>;
  isActive: boolean;
  count: number;
}

export interface SelectionController {
  state: SelectionState;
  toggle: (entry: SelectionEntry) => void;
  setAnchor: (entry: SelectionEntry) => void;
  expandRange: (toEntry: SelectionEntry, allEntries: SelectionEntry[]) => void;
  selectAll: (allEntries: SelectionEntry[]) => void;
  clear: () => void;
  isSelected: (mediaId: string) => boolean;
  isRangeCandidate: (mediaId: string) => boolean;
  selectedIds: () => string[];
}

export function createSelectionState(): SelectionState {
  return {
    selectedIds: new Set<string>(),
    rangeAnchorIndex: null,
    rangeCandidateIds: new Set<string>(),
    isActive: false,
    count: 0,
  };
}

// ---------------------------------------------------------------------------
// Pure reducer functions — usable with useReducer or direct mutation
// ---------------------------------------------------------------------------

export type SelectionAction =
  | { type: "toggle"; entry: SelectionEntry }
  | { type: "set-anchor"; entry: SelectionEntry }
  | { type: "expand-range"; to: SelectionEntry; all: SelectionEntry[] }
  | { type: "select-all"; all: SelectionEntry[] }
  | { type: "clear" };

export function selectionReducer(
  state: SelectionState,
  action: SelectionAction,
): SelectionState {
  switch (action.type) {
    case "toggle": {
      const next = new Set(state.selectedIds);
      if (next.has(action.entry.mediaId)) {
        next.delete(action.entry.mediaId);
      } else {
        next.add(action.entry.mediaId);
      }
      return {
        ...state,
        selectedIds: next,
        rangeCandidateIds: new Set(),
        rangeAnchorIndex: action.entry.mediaIndex,
        isActive: next.size > 0,
        count: next.size,
      };
    }

    case "set-anchor": {
      // Shift-click start: just record the anchor
      return {
        ...state,
        rangeAnchorIndex: action.entry.mediaIndex,
      };
    }

    case "expand-range": {
      const anchorIdx = state.rangeAnchorIndex ?? action.to.mediaIndex;
      const toIdx = action.to.mediaIndex;
      const lo = Math.min(anchorIdx, toIdx);
      const hi = Math.max(anchorIdx, toIdx);

      const candidates = new Set<string>();
      const next = new Set(state.selectedIds);

      for (const entry of action.all) {
        if (entry.mediaIndex >= lo && entry.mediaIndex <= hi) {
          candidates.add(entry.mediaId);
          next.add(entry.mediaId);
        }
      }

      return {
        ...state,
        selectedIds: next,
        rangeCandidateIds: candidates,
        isActive: next.size > 0,
        count: next.size,
      };
    }

    case "select-all": {
      const next = new Set(action.all.map((e) => e.mediaId));
      return {
        selectedIds: next,
        rangeCandidateIds: new Set(),
        rangeAnchorIndex: null,
        isActive: next.size > 0,
        count: next.size,
      };
    }

    case "clear": {
      return createSelectionState();
    }

    default:
      return state;
  }
}

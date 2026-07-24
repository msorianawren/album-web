import type { GameInputAction } from "./types.ts";

export const MAX_REPLAY_ACTIONS = 12_000;

export function normalizeInputActions(actions: readonly GameInputAction[]) {
  if (actions.length > MAX_REPLAY_ACTIONS) throw new RangeError("Replay action limit exceeded.");

  return actions.map((action, ordinal) => {
    if (!Number.isSafeInteger(action.tick) || action.tick < 0) {
      throw new TypeError(`Invalid replay tick at action ${ordinal}.`);
    }
    if (!action.type || action.type.length > 80) {
      throw new TypeError(`Invalid replay action type at action ${ordinal}.`);
    }
    return { ...action, ordinal };
  }).sort((left, right) => left.tick - right.tick || left.ordinal - right.ordinal)
    .map((action) => ({
      tick: action.tick,
      type: action.type,
      ...(action.payload === undefined ? {} : { payload: action.payload }),
    }));
}

export function actionsForTick(actions: readonly GameInputAction[], tick: number) {
  return actions.filter((action) => action.tick === tick);
}

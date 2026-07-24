import { createSeededRng } from "../../core/rng.ts";

export type SnakeDirection = "up" | "down" | "left" | "right";
export interface SnakePoint { x: number; y: number }
export interface SnakeState {
  seed: string;
  width: number;
  height: number;
  body: SnakePoint[];
  direction: SnakeDirection;
  queuedDirection: SnakeDirection;
  food: SnakePoint;
  score: number;
  foodIndex: number;
  complete: boolean;
}

const vectors: Record<SnakeDirection, SnakePoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const opposite: Record<SnakeDirection, SnakeDirection> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function samePoint(first: SnakePoint, second: SnakePoint) {
  return first.x === second.x && first.y === second.y;
}

function spawnFood(state: Pick<SnakeState, "seed" | "width" | "height" | "body" | "foodIndex">) {
  const available: SnakePoint[] = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const point = { x, y };
      if (!state.body.some((segment) => samePoint(segment, point))) available.push(point);
    }
  }
  if (!available.length) return { x: -1, y: -1 };
  return createSeededRng(`${state.seed}:food:${state.foodIndex}`).pick(available);
}

export function createSnakeState(seed: string, width = 20, height = 15): SnakeState {
  const body = [
    { x: Math.floor(width / 2), y: Math.floor(height / 2) },
    { x: Math.floor(width / 2) - 1, y: Math.floor(height / 2) },
    { x: Math.floor(width / 2) - 2, y: Math.floor(height / 2) },
  ];
  const state: SnakeState = {
    seed,
    width,
    height,
    body,
    direction: "right",
    queuedDirection: "right",
    food: { x: 0, y: 0 },
    score: 0,
    foodIndex: 0,
    complete: false,
  };
  state.food = spawnFood(state);
  return state;
}

export function queueSnakeDirection(state: SnakeState, direction: SnakeDirection) {
  if (direction !== opposite[state.direction]) state.queuedDirection = direction;
}

export function stepSnake(state: SnakeState) {
  if (state.complete) return;
  state.direction = state.queuedDirection;
  const vector = vectors[state.direction];
  const head = state.body[0];
  const next = { x: head.x + vector.x, y: head.y + vector.y };
  if (
    next.x < 0
    || next.y < 0
    || next.x >= state.width
    || next.y >= state.height
    || state.body.some((segment) => samePoint(segment, next))
  ) {
    state.complete = true;
    return;
  }
  state.body.unshift(next);
  if (samePoint(next, state.food)) {
    state.score += 10;
    state.foodIndex += 1;
    state.food = spawnFood(state);
    if (state.food.x < 0) state.complete = true;
  } else {
    state.body.pop();
  }
}

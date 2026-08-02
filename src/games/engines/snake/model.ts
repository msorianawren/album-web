import { createSeededRng } from "../../core/rng.ts";

export type SnakeDirection = "up" | "down" | "left" | "right";
export type SnakePowerUpType = "speed" | "multiplier" | "ghost" | "shrink";
export interface SnakePoint { x: number; y: number }
export interface SnakePowerUp {
  type: SnakePowerUpType;
  point: SnakePoint;
  expiresAtTick: number;
}
export interface SnakeStepResult {
  event: "move" | "food" | "power-up" | "crash";
  powerUp?: SnakePowerUpType;
}
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
  powerUpIndex: number;
  tick: number;
  foodsEaten: number;
  level: number;
  combo: number;
  lastFoodTick: number;
  powerUp: SnakePowerUp | null;
  speedBoostUntil: number;
  multiplierUntil: number;
  ghostUntil: number;
  complete: boolean;
}

const POWER_UP_DURATION_TICKS = 65;
const COMBO_WINDOW_TICKS = 28;

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

function spawnOpenPoint(
  state: Pick<SnakeState, "seed" | "width" | "height" | "body" | "food">,
  namespace: string,
) {
  const available: SnakePoint[] = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const point = { x, y };
      const occupiedBySnake = state.body.some((segment) => samePoint(segment, point));
      if (!occupiedBySnake && !samePoint(state.food, point)) available.push(point);
    }
  }
  if (!available.length) return { x: -1, y: -1 };
  return createSeededRng(`${state.seed}:${namespace}`).pick(available);
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

function spawnPowerUp(state: SnakeState): SnakePowerUp | null {
  const point = spawnOpenPoint(state, `power:${state.powerUpIndex}`);
  if (point.x < 0) return null;
  const type = createSeededRng(`${state.seed}:power-type:${state.powerUpIndex}`).pick<SnakePowerUpType>([
    "speed",
    "multiplier",
    "ghost",
    "shrink",
  ]);
  return { type, point, expiresAtTick: state.tick + POWER_UP_DURATION_TICKS };
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
    powerUpIndex: 0,
    tick: 0,
    foodsEaten: 0,
    level: 1,
    combo: 0,
    lastFoodTick: -COMBO_WINDOW_TICKS - 1,
    powerUp: null,
    speedBoostUntil: 0,
    multiplierUntil: 0,
    ghostUntil: 0,
    complete: false,
  };
  state.food = spawnFood(state);
  return state;
}

export function queueSnakeDirection(state: SnakeState, direction: SnakeDirection) {
  if (direction !== opposite[state.direction]) state.queuedDirection = direction;
}

export function stepSnake(state: SnakeState): SnakeStepResult {
  if (state.complete) return { event: "crash" };
  state.tick += 1;
  if (state.powerUp && state.powerUp.expiresAtTick <= state.tick) state.powerUp = null;
  state.direction = state.queuedDirection;
  const vector = vectors[state.direction];
  const head = state.body[0];
  const next = { x: head.x + vector.x, y: head.y + vector.y };

  // Toroidal wrap-around: entering any wall exits on opposite border
  next.x = (next.x + state.width) % state.width;
  next.y = (next.y + state.height) % state.height;

  // Self-collision check (ghost power-up gives immunity to self-collision)
  const ghostActive = state.ghostUntil > state.tick;
  if (!ghostActive && state.body.some((segment) => samePoint(segment, next))) {
    state.complete = true;
    return { event: "crash" };
  }
  state.body.unshift(next);

  if (state.powerUp && samePoint(next, state.powerUp.point)) {
    const collected = state.powerUp.type;
    if (collected === "speed") state.speedBoostUntil = state.tick + POWER_UP_DURATION_TICKS;
    if (collected === "multiplier") state.multiplierUntil = state.tick + POWER_UP_DURATION_TICKS;
    if (collected === "ghost") state.ghostUntil = state.tick + POWER_UP_DURATION_TICKS;
    if (collected === "shrink") state.body.splice(Math.max(3, state.body.length - 3));
    state.powerUp = null;
    state.body.pop();
    return { event: "power-up", powerUp: collected };
  }

  if (samePoint(next, state.food)) {
    state.combo = state.tick - state.lastFoodTick <= COMBO_WINDOW_TICKS
      ? Math.min(4, state.combo + 1)
      : 1;
    const multiplier = state.multiplierUntil > state.tick ? 2 : 1;
    state.score += 10 * state.combo * multiplier;
    state.lastFoodTick = state.tick;
    state.foodsEaten += 1;
    state.level = 1 + Math.floor(state.foodsEaten / 5);
    state.foodIndex += 1;
    state.food = spawnFood(state);
    if (state.food.x < 0) state.complete = true;
    if (state.foodsEaten % 3 === 0 && !state.powerUp) {
      state.powerUpIndex += 1;
      state.powerUp = spawnPowerUp(state);
    }
    return { event: "food" };
  } else {
    state.body.pop();
  }

  return { event: "move" };
}

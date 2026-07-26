import { createSeededRng } from "@/games/core/rng";

export type WrenFlightState = {
  seed: string;
  wrenY: number;
  wrenVy: number;
  obstacles: Array<{
    x: number;
    gapY: number;
    passed: boolean;
  }>;
  score: number;
  tickCounter: number;
  complete: boolean;
};

const GRAVITY = 0.15;
const FLAP_VELOCITY = -2.5;
const OBSTACLE_SPEED = 1.5;
const OBSTACLE_SPAWN_INTERVAL = 120; // ticks
export function getWrenGapSize(score: number) {
  return Math.max(24, 35 - Math.floor(score / 3) * 2);
}
const WREN_X = 30; // Wren is fixed at 30% width
const WREN_RADIUS = 3; // roughly 3% width/height
const OBSTACLE_WIDTH = 8; // 8% width

export function createWrenFlightState(seed: string): WrenFlightState {
  return {
    seed,
    wrenY: 50, // 0 to 100
    wrenVy: 0,
    obstacles: [],
    score: 0,
    tickCounter: 0,
    complete: false,
  };
}

export function flapWren(state: WrenFlightState) {
  if (state.complete) return;
  state.wrenVy = FLAP_VELOCITY;
}

export function stepWrenFlight(state: WrenFlightState) {
  if (state.complete) return;

  state.tickCounter++;
  
  // Physics
  state.wrenVy += GRAVITY;
  state.wrenY += state.wrenVy;

  // Floor / Ceiling collision
  if (state.wrenY < 0) {
    state.wrenY = 0;
    state.wrenVy = 0;
  } else if (state.wrenY > 100 - WREN_RADIUS) {
    state.complete = true;
  }

  // Obstacle spawning
  if (state.tickCounter % OBSTACLE_SPAWN_INTERVAL === 0 || (state.tickCounter === 1 && state.obstacles.length === 0)) {
    // Generate a gap between 20 and 80
    const rng = createSeededRng(state.seed + state.tickCounter);
    const gapY = 20 + Math.floor(rng.next() * 60);
    state.obstacles.push({
      x: 100, // Starts at 100% width
      gapY,
      passed: false,
    });
  }

  // Move obstacles and check collisions
  for (let i = 0; i < state.obstacles.length; i++) {
    const obs = state.obstacles[i];
    obs.x -= OBSTACLE_SPEED;

    // Check passing score
    if (!obs.passed && obs.x + OBSTACLE_WIDTH < WREN_X) {
      obs.passed = true;
      state.score++;
    }

    // AABB Collision check
    const wrenLeft = WREN_X - WREN_RADIUS;
    const wrenRight = WREN_X + WREN_RADIUS;
    const wrenTop = state.wrenY - WREN_RADIUS;
    const wrenBottom = state.wrenY + WREN_RADIUS;

    const obsLeft = obs.x;
    const obsRight = obs.x + OBSTACLE_WIDTH;
    
    // Gap boundaries
    const gapSize = getWrenGapSize(state.score);
    const gapTop = obs.gapY - gapSize / 2;
    const gapBottom = obs.gapY + gapSize / 2;

    if (wrenRight > obsLeft && wrenLeft < obsRight) {
      // In X range of obstacle. Check Y
      if (wrenTop < gapTop || wrenBottom > gapBottom) {
        state.complete = true;
      }
    }
  }

  // Cleanup old obstacles
  if (state.obstacles.length > 0 && state.obstacles[0].x < -20) {
    state.obstacles.shift();
  }
}

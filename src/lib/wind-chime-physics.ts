export type WindChimeImpact = {
  tubeIndex: number;
  velocity: number;
};

export type WindChimeTube = {
  angleX: number;
  angleY: number;
  velocityX: number;
  velocityY: number;
  length: number;
  mass: number;
  cooldown: number;
};

export type WindChimeState = {
  tubes: WindChimeTube[];
  clapper: WindChimeTube;
  accumulator: number;
  sleeping: boolean;
};

export const WIND_CHIME_STEP = 1 / 60;
export const WIND_CHIME_MAX_DELTA = 1 / 24;
export const WIND_CHIME_MAX_ANGLE = 0.34;
const MAX_VELOCITY = 2.8;
const SLEEP_ANGLE = 0.0025;
const SLEEP_VELOCITY = 0.008;

function createPendulum(index: number, count: number): WindChimeTube {
  return {
    angleX: 0,
    angleY: 0,
    velocityX: 0,
    velocityY: 0,
    length: 1.2 + ((count - index) / Math.max(count, 1)) * 0.48,
    mass: 0.78 + index * 0.1,
    cooldown: 0,
  };
}

export function createWindChimeState(tubeCount = 5): WindChimeState {
  return {
    tubes: Array.from({ length: tubeCount }, (_, index) => createPendulum(index, tubeCount)),
    clapper: { ...createPendulum(tubeCount, tubeCount), length: 1.06, mass: 1.25 },
    accumulator: 0,
    sleeping: true,
  };
}

export function applyWindChimeImpulse(
  state: WindChimeState,
  tubeIndex: number,
  impulseX: number,
  impulseY: number,
  strength = 1,
) {
  const tube = state.tubes[tubeIndex];
  if (!tube) return;
  const boundedStrength = Math.min(1.45, Math.max(0.12, strength));
  tube.velocityX = clampVelocity(tube.velocityX + impulseX * boundedStrength / tube.mass);
  tube.velocityY = clampVelocity(tube.velocityY + impulseY * boundedStrength / tube.mass);
  const neighbour = state.tubes[(tubeIndex + 1) % state.tubes.length];
  if (neighbour && neighbour !== tube) {
    neighbour.velocityX = clampVelocity(neighbour.velocityX + impulseX * 0.16);
    neighbour.velocityY = clampVelocity(neighbour.velocityY + impulseY * 0.16);
  }
  state.clapper.velocityX = clampVelocity(state.clapper.velocityX + impulseX * 0.2);
  state.clapper.velocityY = clampVelocity(state.clapper.velocityY + impulseY * 0.2);
  state.sleeping = false;
}

export function advanceWindChime(state: WindChimeState, frameDelta: number): WindChimeImpact[] {
  if (state.sleeping) return [];
  state.accumulator += Math.min(Math.max(frameDelta, 0), WIND_CHIME_MAX_DELTA);
  const impacts: WindChimeImpact[] = [];
  let steps = 0;
  while (state.accumulator >= WIND_CHIME_STEP && steps < 3) {
    stepWindChime(state, WIND_CHIME_STEP, impacts);
    state.accumulator -= WIND_CHIME_STEP;
    steps += 1;
  }
  if (steps === 3) state.accumulator = 0;
  state.sleeping = isSleeping(state);
  return impacts;
}

export function resolveWindChimeImpact(
  tube: WindChimeTube,
  relativeVelocity: number,
): number {
  if (tube.cooldown > 0 || Math.abs(relativeVelocity) < 0.22) return 0;
  tube.cooldown = 0.11;
  return Math.min(1, Math.abs(relativeVelocity) / 1.5);
}

function stepWindChime(state: WindChimeState, delta: number, impacts: WindChimeImpact[]) {
  for (const tube of state.tubes) integratePendulum(tube, delta, 1);
  // The clapper trails the average tube motion; it remains independently damped.
  const averageX = state.tubes.reduce((sum, tube) => sum + tube.angleX, 0) / state.tubes.length;
  const averageY = state.tubes.reduce((sum, tube) => sum + tube.angleY, 0) / state.tubes.length;
  state.clapper.velocityX += (averageX - state.clapper.angleX) * 3.6 * delta;
  state.clapper.velocityY += (averageY - state.clapper.angleY) * 3.6 * delta;
  integratePendulum(state.clapper, delta, 0.82);

  state.tubes.forEach((tube, index) => {
    const relativeVelocity = Math.hypot(
      tube.velocityX - state.clapper.velocityX,
      tube.velocityY - state.clapper.velocityY,
    );
    const angleDistance = Math.hypot(tube.angleX - state.clapper.angleX, tube.angleY - state.clapper.angleY);
    if (angleDistance < 0.08) {
      const impact = resolveWindChimeImpact(tube, relativeVelocity);
      if (impact > 0) {
        tube.velocityX = clampVelocity(tube.velocityX + (tube.angleX - state.clapper.angleX || 0.02) * 0.35);
        tube.velocityY = clampVelocity(tube.velocityY + (tube.angleY - state.clapper.angleY || -0.02) * 0.35);
        impacts.push({ tubeIndex: index, velocity: impact });
      }
    }
  });
}

function integratePendulum(pendulum: WindChimeTube, delta: number, gravityScale: number) {
  pendulum.cooldown = Math.max(0, pendulum.cooldown - delta);
  const restoring = (9.81 / pendulum.length) * gravityScale;
  pendulum.velocityX = clampVelocity((pendulum.velocityX - Math.sin(pendulum.angleX) * restoring * delta) * Math.exp(-2.45 * delta));
  pendulum.velocityY = clampVelocity((pendulum.velocityY - Math.sin(pendulum.angleY) * restoring * delta) * Math.exp(-2.45 * delta));
  pendulum.angleX = clampAngle(pendulum.angleX + pendulum.velocityX * delta);
  pendulum.angleY = clampAngle(pendulum.angleY + pendulum.velocityY * delta);
}

function clampVelocity(value: number) {
  return Math.min(MAX_VELOCITY, Math.max(-MAX_VELOCITY, value));
}

function clampAngle(value: number) {
  return Math.min(WIND_CHIME_MAX_ANGLE, Math.max(-WIND_CHIME_MAX_ANGLE, value));
}

function isSleeping(state: WindChimeState) {
  return [...state.tubes, state.clapper].every(
    (pendulum) => Math.abs(pendulum.angleX) < SLEEP_ANGLE
      && Math.abs(pendulum.angleY) < SLEEP_ANGLE
      && Math.abs(pendulum.velocityX) < SLEEP_VELOCITY
      && Math.abs(pendulum.velocityY) < SLEEP_VELOCITY,
  );
}

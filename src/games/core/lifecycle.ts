export interface FixedStepAdvance {
  ticks: readonly number[];
  interpolation: number;
  droppedMs: number;
}

export class FixedStepClock {
  private accumulatorMs = 0;
  private tick = 0;
  private stepMs: number;
  readonly maximumCatchUpSteps: number;

  constructor(stepMs = 1000 / 60, maximumCatchUpSteps = 5) {
    if (!(stepMs > 0) || !Number.isSafeInteger(maximumCatchUpSteps) || maximumCatchUpSteps < 1) {
      throw new RangeError("Invalid fixed-step clock configuration.");
    }
    this.stepMs = stepMs;
    this.maximumCatchUpSteps = maximumCatchUpSteps;
  }

  advance(elapsedMs: number): FixedStepAdvance {
    const boundedElapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
    this.accumulatorMs += boundedElapsed;
    const ticks: number[] = [];

    while (this.accumulatorMs >= this.stepMs && ticks.length < this.maximumCatchUpSteps) {
      this.accumulatorMs -= this.stepMs;
      this.tick += 1;
      ticks.push(this.tick);
    }

    const droppedMs = this.accumulatorMs >= this.stepMs ? this.accumulatorMs : 0;
    if (droppedMs > 0) this.accumulatorMs %= this.stepMs;

    return {
      ticks,
      interpolation: this.accumulatorMs / this.stepMs,
      droppedMs,
    };
  }

  reset() {
    this.accumulatorMs = 0;
    this.tick = 0;
  }

  setStepMs(stepMs: number) {
    if (!(stepMs > 0) || !Number.isFinite(stepMs)) {
      throw new RangeError("A positive fixed-step duration is required.");
    }
    this.stepMs = stepMs;
    this.accumulatorMs = Math.min(this.accumulatorMs, stepMs);
  }

  get currentTick() {
    return this.tick;
  }
}

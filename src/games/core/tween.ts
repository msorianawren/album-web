// Lightweight easing and interpolation utilities for game animations

export type EasingFn = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInCubic: (t: number) => t * t * t,
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeOutBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutBounce: (t: number) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInOutElastic: (t: number) => {
    const c5 = (2 * Math.PI) / 4.5;
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function inverseLerp(a: number, b: number, value: number): number {
  return b === a ? 0 : clamp((value - a) / (b - a), 0, 1);
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp(inverseLerp(a, b, x), 0, 1);
  return t * t * (3 - 2 * t);
}

/** A simple timer tween. Progress goes 0→1 over `duration` seconds */
export class Tween {
  private elapsed = 0;
  private done = false;
  constructor(
    public duration: number,
    private easing: EasingFn = Easing.easeOutCubic,
  ) {}

  update(dt: number) {
    if (this.done) return;
    this.elapsed = Math.min(this.elapsed + dt, this.duration);
    if (this.elapsed >= this.duration) this.done = true;
  }

  get progress(): number {
    return this.duration > 0 ? this.easing(this.elapsed / this.duration) : 1;
  }
  get finished(): boolean { return this.done; }
  reset() { this.elapsed = 0; this.done = false; }
}

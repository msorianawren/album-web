// Trauma-based screen shake system
// Usage: shake.add(1.0); // full trauma; shake.apply(ctx) before drawing

export class ScreenShake {
  private trauma = 0;
  private readonly maxShake: number;
  private readonly decay: number;
  private readonly frequency: number;
  private seedX = Math.random() * 1000;
  private seedY = Math.random() * 1000;

  constructor(maxShake = 20, decay = 0.9, frequency = 0.3) {
    this.maxShake = maxShake;
    this.decay = decay;
    this.frequency = frequency;
  }

  /** Add trauma. 0–1 scale; 1 = maximum shake */
  add(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Call every frame. dt in seconds */
  update(dt: number) {
    this.trauma = Math.max(0, this.trauma - this.decay * dt);
  }

  /** Apply transform to canvas context before drawing */
  apply(ctx: CanvasRenderingContext2D, time: number) {
    if (this.trauma <= 0) return;
    const shake = this.trauma * this.trauma; // square for better feel
    const angle = Math.sin(time * this.frequency * Math.PI * 2 + this.seedX) * shake * 0.04;
    const dx = Math.sin(time * this.frequency * Math.PI * 2 * 1.3 + this.seedY) * shake * this.maxShake;
    const dy = Math.cos(time * this.frequency * Math.PI * 2 * 0.9 + this.seedX) * shake * this.maxShake;
    ctx.translate(dx, dy);
    ctx.rotate(angle);
  }

  get active() { return this.trauma > 0.01; }
  reset() { this.trauma = 0; }
}

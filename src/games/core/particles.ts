// GPU-friendly Canvas 2D particle system for all games

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // remaining life in seconds
  maxLife: number;
  size: number;
  startSize: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  drag: number;
  shrink: number;     // size multiplier lost per second
  blendMode: GlobalCompositeOperation;
  shape: "circle" | "square" | "star";
}

export interface EmitOptions {
  x: number;
  y: number;
  count: number;
  speedMin?: number;
  speedMax?: number;
  angleMin?: number;
  angleMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  lifeMin?: number;
  lifeMax?: number;
  colors?: string[];
  gravity?: number;
  drag?: number;
  shrink?: number;
  blendMode?: GlobalCompositeOperation;
  rotationSpeed?: number;
  shape?: "circle" | "square" | "star";
}

export class ParticleSystem {
  private pool: Particle[] = [];
  private active: Particle[] = [];

  private acquire(): Particle {
    return this.pool.pop() ?? {} as Particle;
  }

  emit(opts: EmitOptions) {
    const {
      x, y, count,
      speedMin = 1, speedMax = 5,
      angleMin = 0, angleMax = Math.PI * 2,
      sizeMin = 2, sizeMax = 6,
      lifeMin = 0.5, lifeMax = 1.5,
      colors = ["#ffffff"],
      gravity = 0.15,
      drag = 0.97,
      shrink = 0,
      blendMode = "source-over",
      rotationSpeed = 0,
      shape = "circle",
    } = opts;

    for (let i = 0; i < count; i++) {
      const angle = angleMin + Math.random() * (angleMax - angleMin);
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const maxLife = lifeMin + Math.random() * (lifeMax - lifeMin);
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      const p = this.acquire();
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = maxLife; p.maxLife = maxLife;
      p.size = size; p.startSize = size;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * rotationSpeed * 2;
      p.gravity = gravity; p.drag = drag; p.shrink = shrink;
      p.blendMode = blendMode; p.shape = shape;
      this.active.push(p);
    }
  }

  /** dt in seconds */
  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.push(this.active.splice(i, 1)[0]);
        continue;
      }
      p.vy += p.gravity * dt * 60;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.rotation += p.rotationSpeed * dt * 60;
      p.alpha = p.life / p.maxLife;
      if (p.shrink > 0) {
        p.size = Math.max(0.1, p.startSize * p.alpha);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.active.length === 0) return;
    for (const p of this.active) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.globalCompositeOperation = p.blendMode;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "square") {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.shape === "star") {
        drawStar(ctx, 0, 0, 5, p.size, p.size * 0.45);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  get count() { return this.active.length; }
  clear() {
    this.pool.push(...this.active);
    this.active = [];
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}

// ---- Preset factories ----

export const Burst = {
  explosion: (x: number, y: number, color = "#ff6b35"): EmitOptions => ({
    x, y, count: 28,
    speedMin: 2, speedMax: 10,
    sizeMin: 2, sizeMax: 7,
    lifeMin: 0.35, lifeMax: 0.9,
    colors: [color, "#ffba08", "#fff"],
    gravity: 0.25, drag: 0.93,
    blendMode: "lighter",
  }),

  foodEat: (x: number, y: number, color = "#ffd700"): EmitOptions => ({
    x, y, count: 14,
    speedMin: 1.5, speedMax: 5,
    sizeMin: 2, sizeMax: 5,
    lifeMin: 0.3, lifeMax: 0.7,
    colors: [color, "#fff", "#ffe082"],
    gravity: -0.05, drag: 0.94,
    blendMode: "lighter",
    shrink: 1,
  }),

  trail: (x: number, y: number, color = "#4fc3f7"): EmitOptions => ({
    x, y, count: 3,
    speedMin: 0.3, speedMax: 1.5,
    sizeMin: 2, sizeMax: 4,
    lifeMin: 0.12, lifeMax: 0.3,
    colors: [color],
    gravity: 0, drag: 0.88,
    blendMode: "lighter",
    shrink: 1,
  }),

  confetti: (x: number, y: number): EmitOptions => ({
    x, y, count: 60,
    speedMin: 4, speedMax: 14,
    angleMin: -Math.PI, angleMax: 0,
    sizeMin: 3, sizeMax: 7,
    lifeMin: 1.0, lifeMax: 2.5,
    colors: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#a8e6cf", "#ff8b94", "#ffd700", "#c084fc"],
    gravity: 0.35, drag: 0.97,
    rotationSpeed: 8,
    shape: "square",
  }),

  sparkle: (x: number, y: number, color = "#ffd700"): EmitOptions => ({
    x, y, count: 16,
    speedMin: 0.8, speedMax: 3.5,
    sizeMin: 1, sizeMax: 4,
    lifeMin: 0.5, lifeMax: 1.1,
    colors: [color, "#fff"],
    gravity: -0.04, drag: 0.96,
    blendMode: "lighter",
    shape: "star",
  }),

  stoneImpact: (x: number, y: number): EmitOptions => ({
    x, y, count: 12,
    speedMin: 1, speedMax: 6,
    angleMin: -Math.PI, angleMax: 0,
    sizeMin: 2, sizeMax: 5,
    lifeMin: 0.3, lifeMax: 0.8,
    colors: ["#a0856a", "#c4a882", "#7a6048"],
    gravity: 0.4, drag: 0.92,
  }),

  bloomPetals: (x: number, y: number): EmitOptions => ({
    x, y, count: 20,
    speedMin: 1, speedMax: 6,
    sizeMin: 3, sizeMax: 8,
    lifeMin: 0.8, lifeMax: 1.8,
    colors: ["#f48fb1", "#f8bbd9", "#fff9c4", "#c8e6c9", "#ffcc80"],
    gravity: 0.06, drag: 0.97,
    rotationSpeed: 4,
    shape: "star",
  }),
};

"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameSurface } from "@/components/games/GameSurface";
import { Button } from "@/components/ui/Button";
import { useGameAudio } from "@/games/core/audio-context.client";
import { Burst, ParticleSystem } from "@/games/core/particles";
import { createFixedStepRuntime } from "@/games/core/runtime";
import { ScreenShake } from "@/games/core/screenshake";
import type { GameClientProps, FinalizeGameSessionResponse, GameInputAction, GameReplayTrace } from "@/games/core/types";
import {
  createSnakeState,
  queueSnakeDirection,
  stepSnake,
  type SnakeDirection,
  type SnakePowerUpType,
  type SnakePoint,
  type SnakeState,
} from "./model";

const powerUpStyle: Record<SnakePowerUpType, { color: string; label: string; symbol: string }> = {
  speed: { color: "#ff6b6b", label: "Speed burst", symbol: "↯" },
  multiplier: { color: "#ffd166", label: "Double score", symbol: "★" },
  ghost: { color: "#a78bfa", label: "Ghost trail", symbol: "◌" },
  shrink: { color: "#5eead4", label: "Tail trim", symbol: "✦" },
};

function getBaseStepMs(speed: "slow" | "normal" | "fast") {
  return speed === "slow" ? 190 : speed === "normal" ? 145 : 100;
}

function getSnakeStepMs(speed: "slow" | "normal" | "fast", state: SnakeState) {
  const base = getBaseStepMs(speed);
  const levelAcceleration = Math.min(25, (state.level - 1) * 3.5);
  const speedBurst = state.speedBoostUntil > state.tick ? 18 : 0;
  return Math.max(55, Math.round(base - levelAcceleration - speedBurst));
}

function getCanvasPoint(canvas: HTMLCanvasElement, state: SnakeState, point: SnakePoint) {
  const cell = Math.min(canvas.width / state.width, canvas.height / state.height);
  const offsetX = (canvas.width - cell * state.width) / 2;
  const offsetY = (canvas.height - cell * state.height) / 2;
  return { x: offsetX + (point.x + 0.5) * cell, y: offsetY + (point.y + 0.5) * cell };
}

function drawSnake(
  canvas: HTMLCanvasElement,
  state: SnakeState,
  quality: GameClientProps["quality"],
  previousBody: SnakePoint[],
  interpolation: number,
  particles: ParticleSystem,
  shake: ScreenShake,
) {
  const rect = canvas.getBoundingClientRect();
  const maxDpr = quality === "low" ? 1 : window.matchMedia("(pointer: coarse)").matches ? 1.25 : 1.5;
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  const cell = Math.min(width / state.width, height / state.height);
  const offsetX = (width - cell * state.width) / 2;
  const offsetY = (height - cell * state.height) / 2;
  
  context.clearRect(0, 0, width, height);
  context.save();
  shake.apply(context, performance.now() / 1000);

  const levelHue = 190 + Math.min(65, (state.level - 1) * 13);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, `hsl(${levelHue}, 30%, 13%)`);
  background.addColorStop(1, `hsl(${levelHue + 24}, 36%, 8%)`);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  
  // Draw Grass Checkerboard (Vibrant mystical forest)
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const isEven = (x + y) % 2 === 0;
      context.fillStyle = isEven ? "rgba(74, 111, 122, 0.42)" : "rgba(34, 55, 66, 0.52)";
      context.fillRect(offsetX + x * cell, offsetY + y * cell, cell + 0.5, cell + 0.5);
    }
  }

  // Draw a subtle border around the play area with a gentle wrap glow
  context.strokeStyle = "rgba(255, 255, 255, 0.12)";
  context.lineWidth = 1.5;
  context.strokeRect(offsetX, offsetY, state.width * cell, state.height * cell);

  // Calculate interpolated positions with seamless toroidal wrap handling
  const t = state.complete ? 1 : Math.max(0, Math.min(1, interpolation));
  
  const getWrappedInterpolated = (prev: SnakePoint | undefined, curr: SnakePoint) => {
    if (!prev) return { x: curr.x, y: curr.y };
    
    let dx = curr.x - prev.x;
    if (dx < -1) dx += state.width;
    else if (dx > 1) dx -= state.width;
    
    let dy = curr.y - prev.y;
    if (dy < -1) dy += state.height;
    else if (dy > 1) dy -= state.height;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      return { x: curr.x, y: curr.y };
    }

    let continuousX = prev.x + dx * t;
    let continuousY = prev.y + dy * t;

    continuousX = (continuousX % state.width + state.width) % state.width;
    continuousY = (continuousY % state.height + state.height) % state.height;

    return { x: continuousX, y: continuousY };
  };

  const bodyPoints = state.body.map((segment, index) => {
    const prev = previousBody[index] || segment;
    return getWrappedInterpolated(prev, segment);
  });

  // Clip the snake drawing to the board bounds so crossing segments never spill outside or distort
  context.save();
  context.beginPath();
  context.rect(offsetX, offsetY, state.width * cell, state.height * cell);
  context.clip();

  if (bodyPoints.length > 0) {
    const head = bodyPoints[0];
    const isGhost = state.ghostUntil > state.tick;
    
    // Draw Snake Body Path
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = cell * 0.76;
    context.shadowColor = isGhost ? "rgba(167, 139, 250, 0.9)" : "rgba(255, 247, 232, 0.4)";
    context.shadowBlur = cell * (isGhost ? 0.8 : 0.5);

    // Draw from tail to head
    for (let i = bodyPoints.length - 1; i > 0; i--) {
      const start = bodyPoints[i];
      const end = bodyPoints[i - 1];
      
      const alpha = isGhost 
        ? Math.max(0.45, 0.92 - i * 0.03) 
        : Math.max(0.4, 1 - i * 0.04);

      context.strokeStyle = isGhost 
        ? `rgba(167, 139, 250, ${alpha})`
        : `rgba(0, 212, 255, ${alpha})`;

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const wrapsX = Math.abs(dx) > 1.5;
      const wrapsY = Math.abs(dy) > 1.5;

      if (!wrapsX && !wrapsY) {
        // Normal segment
        context.beginPath();
        context.moveTo(offsetX + start.x * cell + cell * 0.5, offsetY + start.y * cell + cell * 0.5);
        context.lineTo(offsetX + end.x * cell + cell * 0.5, offsetY + end.y * cell + cell * 0.5);
        context.stroke();
      } else {
        // Dual-portal wrapped segment: draw 2 halves projected through boundaries
        const virtualEndX = dx < -1.5 ? end.x + state.width : dx > 1.5 ? end.x - state.width : end.x;
        const virtualEndY = dy < -1.5 ? end.y + state.height : dy > 1.5 ? end.y - state.height : end.y;

        const virtualStartX = dx < -1.5 ? start.x - state.width : dx > 1.5 ? start.x + state.width : start.x;
        const virtualStartY = dy < -1.5 ? start.y - state.height : dy > 1.5 ? start.y + state.height : start.y;

        // Half 1: exiting start border
        context.beginPath();
        context.moveTo(offsetX + start.x * cell + cell * 0.5, offsetY + start.y * cell + cell * 0.5);
        context.lineTo(offsetX + virtualEndX * cell + cell * 0.5, offsetY + virtualEndY * cell + cell * 0.5);
        context.stroke();

        // Half 2: entering end border
        context.beginPath();
        context.moveTo(offsetX + virtualStartX * cell + cell * 0.5, offsetY + virtualStartY * cell + cell * 0.5);
        context.lineTo(offsetX + end.x * cell + cell * 0.5, offsetY + end.y * cell + cell * 0.5);
        context.stroke();
      }
    }

    // Helper to draw head + eyes at any grid offset
    const drawHeadAt = (hx: number, hy: number) => {
      const headCenterX = offsetX + hx * cell + cell * 0.5;
      const headCenterY = offsetY + hy * cell + cell * 0.5;

      context.save();
      context.shadowBlur = isGhost ? cell * 1.1 : cell * 0.8;
      context.shadowColor = isGhost ? "rgba(167, 139, 250, 0.95)" : "rgba(0, 255, 255, 0.9)";
      context.fillStyle = isGhost ? "#f3e8ff" : "#e0fbfc";
      context.beginPath();
      context.arc(headCenterX, headCenterY, cell * 0.38, 0, Math.PI * 2);
      context.fill();

      // Draw Eyes
      context.shadowBlur = 0;
      context.fillStyle = isGhost ? "#581c87" : "#17271f";
      const eyeOffset = cell * 0.15;
      const eyeRadius = cell * 0.08;
      
      let dx = 0;
      let dy = 0;
      if (state.direction === "up") dy = -1;
      if (state.direction === "down") dy = 1;
      if (state.direction === "left") dx = -1;
      if (state.direction === "right") dx = 1;

      const nx = dy;
      const ny = -dx;

      context.beginPath();
      context.arc(
        headCenterX + dx * eyeOffset + nx * eyeOffset,
        headCenterY + dy * eyeOffset + ny * eyeOffset,
        eyeRadius, 0, Math.PI * 2
      );
      context.fill();

      context.beginPath();
      context.arc(
        headCenterX + dx * eyeOffset - nx * eyeOffset,
        headCenterY + dy * eyeOffset - ny * eyeOffset,
        eyeRadius, 0, Math.PI * 2
      );
      context.fill();
      context.restore();
    };

    // Draw primary head
    drawHeadAt(head.x, head.y);

    // If head is close to any boundary (< 1 cell), draw wrapped projection on opposite border
    if (head.x < 1) drawHeadAt(head.x + state.width, head.y);
    if (head.x > state.width - 1) drawHeadAt(head.x - state.width, head.y);
    if (head.y < 1) drawHeadAt(head.x, head.y + state.height);
    if (head.y > state.height - 1) drawHeadAt(head.x, head.y - state.height);
  }

  context.restore(); // Restore board clip

  // Draw Detailed Berry (Food)
  const pulse = Math.sin(performance.now() / 200) * 0.05 + 0.95;
  const foodCenterX = offsetX + (state.food.x + 0.5) * cell;
  const foodCenterY = offsetY + (state.food.y + 0.5) * cell;
  const foodRadius = cell * 0.35 * pulse;
  
  context.shadowBlur = cell * 0.6 * pulse;
  context.shadowColor = "rgba(238, 108, 77, 0.8)";
  
  // Berry body
  context.fillStyle = "#ee6c4d";
  context.beginPath();
  context.arc(foodCenterX, foodCenterY, foodRadius, 0, Math.PI * 2);
  context.fill();
  
  context.shadowBlur = 0;
  
  // Berry highlight (shiny effect)
  context.fillStyle = "rgba(255, 255, 255, 0.6)";
  context.beginPath();
  context.ellipse(foodCenterX - foodRadius * 0.3, foodCenterY - foodRadius * 0.3, foodRadius * 0.3, foodRadius * 0.15, -Math.PI / 4, 0, Math.PI * 2);
  context.fill();
  
  // Berry leaf
  context.fillStyle = "#98c1d9";
  context.beginPath();
  context.ellipse(foodCenterX + foodRadius * 0.2, foodCenterY - foodRadius * 0.7, foodRadius * 0.4, foodRadius * 0.15, Math.PI / 4, 0, Math.PI * 2);
  context.fill();

  if (state.powerUp) {
    const power = powerUpStyle[state.powerUp.type];
    const centerX = offsetX + (state.powerUp.point.x + 0.5) * cell;
    const centerY = offsetY + (state.powerUp.point.y + 0.5) * cell;
    const pulse = 0.84 + Math.sin(performance.now() / 120) * 0.12;
    context.save();
    context.globalAlpha = Math.max(0.35, (state.powerUp.expiresAtTick - state.tick) / 12);
    context.fillStyle = power.color;
    context.shadowColor = power.color;
    context.shadowBlur = cell * 0.85;
    context.beginPath();
    context.arc(centerX, centerY, cell * 0.31 * pulse, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#10212a";
    context.font = `700 ${Math.max(10, cell * 0.42)}px system-ui`;
    context.textAlign = "center";
    context.textBaseline = "middle";
context.fillText(power.symbol, centerX, centerY + 1);
    context.restore();
  }

  particles.render(context);
  context.restore();
}

function generatePracticeSeed() {
  return "practice-" + Math.random().toString(36).slice(2);
}

export default function SnakeGame({
  onEngineStatusChange,
  quality = "balanced",
  signedIn,
}: GameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentSeed, setCurrentSeed] = useState("practice-initial");
  const stateRef = useRef(createSnakeState(currentSeed));
  const runtimeRef = useRef<ReturnType<typeof createFixedStepRuntime> | null>(null);
  
  const sessionRef = useRef<{ id: string; nonce: string; seed: string } | null>(null);
  const traceRef = useRef<GameInputAction[]>([]);
  const actionQueueRef = useRef<Array<{ tick: number, dir: SnakeDirection }>>([]);
  const previousBodyRef = useRef<SnakePoint[]>([]);
  const particlesRef = useRef(new ParticleSystem());
  const shakeRef = useRef(new ScreenShake(12, 1.8, 5));
  const lastRenderAtRef = useRef<number | null>(null);

  const [status, setStatus] = useState<"ready" | "running" | "paused" | "complete">("ready");
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [completion, setCompletion] = useState<FinalizeGameSessionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hud, setHud] = useState<{ level: number; combo: number; activePower: SnakePowerUpType | null }>({
    level: 1,
    combo: 0,
    activePower: null,
  });

  const { playSfx, start: startAudio } = useGameAudio();

  const pause = useCallback(() => {
    setStatus(s => {
      if (s === "running") {
        runtimeRef.current?.pause();
        onEngineStatusChange?.("paused");
        return "paused";
      }
      return s;
    });
  }, [onEngineStatusChange]);

  const togglePause = useCallback(() => {
    setStatus(s => {
      if (s === "running") {
        runtimeRef.current?.pause();
        onEngineStatusChange?.("paused");
        return "paused";
      } else if (s === "paused") {
        runtimeRef.current?.start();
        onEngineStatusChange?.("running");
        return "running";
      }
      return s;
    });
  }, [onEngineStatusChange]);

  const setDirection = useCallback((direction: SnakeDirection) => {
    if (!runtimeRef.current) return;
    const tick = runtimeRef.current.tick;
    const lastPendingDir = actionQueueRef.current.length > 0
      ? actionQueueRef.current[actionQueueRef.current.length - 1].dir
      : stateRef.current.direction;
    const oppositeDir = ({ up: "down", down: "up", left: "right", right: "left" } as const)[lastPendingDir];
    if (direction !== lastPendingDir && direction !== oppositeDir) {
      if (actionQueueRef.current.length < 2) {
        actionQueueRef.current.push({ tick, dir: direction });
      } else {
        actionQueueRef.current[1] = { tick, dir: direction };
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const runtime = createFixedStepRuntime({
      stepMs: getBaseStepMs(speed),
      targetRenderFps: quality === "low" ? 30 : 60,
      onTick(tick) {
        previousBodyRef.current = stateRef.current.body.map(p => ({ ...p }));

        let actionProcessed = false;
        while (actionQueueRef.current.length > 0 && !actionProcessed) {
          const action = actionQueueRef.current.shift()!;
          const isOpposite = action.dir === ({ up: "down", down: "up", left: "right", right: "left" } as const)[stateRef.current.direction];
          const isSame = action.dir === stateRef.current.direction;
          
          if (!isOpposite && !isSame) {
            queueSnakeDirection(stateRef.current, action.dir);
            traceRef.current.push({ tick, type: "direction", payload: action.dir });
            actionProcessed = true;
          }
        }
        
        const result = stepSnake(stateRef.current);
        runtime.setStepMs(getSnakeStepMs(speed, stateRef.current));

        if (result.event === "food") {
          setScore(stateRef.current.score);
          setHud((current) => ({ ...current, level: stateRef.current.level, combo: stateRef.current.combo }));
          if (quality !== "low") {
            const point = getCanvasPoint(canvas, stateRef.current, stateRef.current.body[0]);
            particlesRef.current.emit(Burst.foodEat(point.x, point.y));
          }
          playSfx("snake-food");
        }
        if (result.event === "power-up" && result.powerUp) {
          const point = getCanvasPoint(canvas, stateRef.current, stateRef.current.body[0]);
          particlesRef.current.emit(Burst.sparkle(point.x, point.y, powerUpStyle[result.powerUp].color));
          shakeRef.current.add(0.18);
          setHud((current) => ({ ...current, activePower: result.powerUp! }));
          playSfx("snake-power");
        }
        if (tick % 5 === 0) {
          const activePower: SnakePowerUpType | null = stateRef.current.speedBoostUntil > stateRef.current.tick
            ? "speed"
            : stateRef.current.multiplierUntil > stateRef.current.tick
              ? "multiplier"
              : stateRef.current.ghostUntil > stateRef.current.tick
                ? "ghost"
                : null;
          setHud((current) => current.activePower === activePower ? current : { ...current, activePower });
        }
        if (stateRef.current.complete) {
          const point = getCanvasPoint(canvas, stateRef.current, stateRef.current.body[0]);
          if (quality !== "low") particlesRef.current.emit(Burst.explosion(point.x, point.y, "#7dd3fc"));
          shakeRef.current.add(0.85);
          runtime.pause();
          setStatus("complete");
          onEngineStatusChange?.("paused");
          playSfx("snake-crash");
        }
      },
      onRender(interpolation) {
        const now = performance.now();
        const previous = lastRenderAtRef.current ?? now;
        const deltaSeconds = Math.min(0.1, Math.max(0, (now - previous) / 1000));
        lastRenderAtRef.current = now;
        particlesRef.current.update(deltaSeconds);
        shakeRef.current.update(deltaSeconds);
        drawSnake(canvas, stateRef.current, quality, previousBodyRef.current, interpolation, particlesRef.current, shakeRef.current);
      },
    });
    runtimeRef.current = runtime;
    drawSnake(canvas, stateRef.current, quality, previousBodyRef.current, 1, particlesRef.current, shakeRef.current);
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = ({
        ArrowUp: "up",
        w: "up",
        ArrowDown: "down",
        s: "down",
        ArrowLeft: "left",
        a: "left",
        ArrowRight: "right",
        d: "right",
      } as Record<string, SnakeDirection | undefined>)[event.key];
      
      if (event.key === "p" || event.key === "Escape") {
        event.preventDefault();
        togglePause();
        return;
      }

      if (!direction) return;
      event.preventDefault();
      setDirection(direction);
    };
    window.addEventListener("keydown", onKeyDown);
    const observer = new ResizeObserver(() => drawSnake(canvas, stateRef.current, quality, previousBodyRef.current, 1, particlesRef.current, shakeRef.current));
    observer.observe(canvas);
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onEngineStatusChange, playSfx, quality, setDirection, speed, togglePause]);

  const start = useCallback(async () => {
    void startAudio();

    if (status === "complete" || status === "ready") {
      setCompletion(null);
      setScore(0);
      actionQueueRef.current = [];
      traceRef.current = [];

      let nextSeed = generatePracticeSeed();
      
      if (signedIn) {
        try {
          const response = await fetch("/api/game-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameSlug: "snake", difficultyKey: "standard" }),
          });
          if (response.ok) {
            const { data } = await response.json();
            nextSeed = data.seed;
            sessionRef.current = { id: data.sessionId, nonce: data.nonce, seed: data.seed };
          } else {
            sessionRef.current = null;
          }
        } catch (e) {
          sessionRef.current = null;
        }
      }
      
    setCurrentSeed(nextSeed);
    stateRef.current = createSnakeState(nextSeed);
    runtimeRef.current?.reset();
    runtimeRef.current?.setStepMs(getSnakeStepMs(speed, stateRef.current));
    particlesRef.current.clear();
    shakeRef.current.reset();
    lastRenderAtRef.current = null;
    setHud({ level: 1, combo: 0, activePower: null });
    }
    
    runtimeRef.current?.start();
    setStatus("running");
    onEngineStatusChange?.("running");
  }, [onEngineStatusChange, signedIn, speed, startAudio, status]);


  const restart = useCallback(() => {
    runtimeRef.current?.pause();
    runtimeRef.current?.reset();
    actionQueueRef.current = [];
    traceRef.current = [];
    sessionRef.current = null;

    const nextSeed = generatePracticeSeed();
    setCurrentSeed(nextSeed);
    stateRef.current = createSnakeState(nextSeed);
    runtimeRef.current?.setStepMs(getSnakeStepMs(speed, stateRef.current));
    
    setScore(0);
    setHud({ level: 1, combo: 0, activePower: null });
    particlesRef.current.clear();
    shakeRef.current.reset();
    lastRenderAtRef.current = null;
    setStatus("ready");
    setCompletion(null);
    onEngineStatusChange?.("ready");
    const canvas = canvasRef.current;
    if (canvas) {
      previousBodyRef.current = stateRef.current.body.map(p => ({ ...p }));
      drawSnake(canvas, stateRef.current, quality, previousBodyRef.current, 1, particlesRef.current, shakeRef.current);
    }
  }, [onEngineStatusChange, quality, speed]);

  useEffect(() => {
    if (status === "complete" && sessionRef.current && !completion && !submitting) {
      setSubmitting(true);
      const session = sessionRef.current;
      const trace: GameReplayTrace = {
        formatVersion: 1,
        engineVersion: "snake-v1",
        seed: session.seed,
        fixedStepMs: getBaseStepMs(speed),
        actions: traceRef.current,
      };
      
      fetch(`/api/game-sessions/${session.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nonce: session.nonce, replay: trace }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data) {
            setCompletion(json.data);
            window.dispatchEvent(new CustomEvent("wren-feathers-update", {
              detail: { rewardGranted: json.data.rewardGranted, balanceAfter: json.data.balanceAfter }
            }));
          }
        })
        .finally(() => {
          setSubmitting(false);
          sessionRef.current = null;
        });
    }
  }, [status, completion, submitting, quality, speed]);

  return (
    <GameSurface
      canvasRef={canvasRef}
      title="Wren Trail Snake"
      status={status}
      score={score}
      detail="Guide a ribbon-tailed wren through a quiet moonlit garden. Move freely through borders into the opposite edge. Target: 30 points to earn rewards."
      onStart={start}
      onPause={pause}
      onRestart={restart}
    >
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
        <span className="rounded-full bg-surface/70 px-3 py-1.5">Level {hud.level}</span>
        {hud.combo > 1 && <span className="rounded-full bg-[color-mix(in_srgb,var(--preset-accent)_18%,transparent)] px-3 py-1.5 text-text-primary">Combo ×{hud.combo}</span>}
        {hud.activePower && (
          <span
            className="rounded-full px-3 py-1.5 text-slate-950"
            style={{ backgroundColor: powerUpStyle[hud.activePower].color }}
          >
            {powerUpStyle[hud.activePower].symbol} {powerUpStyle[hud.activePower].label}
          </span>
        )}
      </div>
      {status === "ready" && (
        <div className="flex bg-surface/50 rounded-full p-1 border border-[var(--glass-border)] shadow-inner backdrop-blur-sm justify-center w-fit mx-auto mb-2">
          {(["slow", "normal", "fast"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-4 py-1.5 text-[0.65rem] font-semibold tracking-widest uppercase rounded-full transition-all duration-300 ${
                speed === s 
                  ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20" 
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2" aria-label="Snake touch controls">
        <span />
        <Button variant="icon" aria-label="Move up" onClick={() => setDirection("up")}><ArrowUp className="h-4 w-4" /></Button>
        <span />
        <Button variant="icon" aria-label="Move left" onClick={() => setDirection("left")}><ArrowLeft className="h-4 w-4" /></Button>
        <Button variant="icon" aria-label="Move down" onClick={() => setDirection("down")}><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="icon" aria-label="Move right" onClick={() => setDirection("right")}><ArrowRight className="h-4 w-4" /></Button>
      </div>
      
      {completion && completion.rewardGranted > 0 && (
        <div className="mt-2 rounded-xl bg-[color-mix(in_srgb,var(--preset-accent)_20%,transparent)] p-4 text-center">
          <Check className="mx-auto mb-2 h-6 w-6 text-accent" />
          <p className="font-semibold text-text-primary">
            +{completion.rewardGranted} Wren Feathers
          </p>
          {completion.duplicate && (
            <p className="mt-1 text-xs text-text-secondary">Already completed today.</p>
          )}
        </div>
      )}
      {completion && completion.rewardGranted === 0 && (
        <div className="mt-2 rounded-xl bg-surface/50 p-4 text-center text-sm text-text-secondary">
          Target of 30 points not reached. No feathers awarded.
        </div>
      )}
      {!completion && status === "complete" && !signedIn && (
        <div className="mt-2 rounded-xl bg-surface/50 p-4 text-center text-sm text-text-secondary">
          Practice session complete.
        </div>
      )}
    </GameSurface>
  );
}

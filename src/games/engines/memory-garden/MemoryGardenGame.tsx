"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { GameSurface } from "@/components/games/GameSurface";
import { useGameAudio } from "@/games/core/audio-context.client";
import { createFixedStepRuntime } from "@/games/core/runtime";
import type { GameClientProps, GameInputAction, GameReplayTrace, FinalizeGameSessionResponse } from "@/games/core/types";
import {
  createMemoryGardenState,
  moveMemoryCursor,
  revealMemoryCard,
  stepMemoryGarden,
  type MemoryGardenState,
} from "./model";

const flowers = [
  ["#f1a4b4", 5],
  ["#e9c77b", 6],
  ["#9ab99d", 7],
  ["#b6a7d7", 8],
  ["#85b8c7", 5],
  ["#de9f7f", 6],
  ["#d8d49b", 7],
  ["#ad879f", 8],
] as const;

function cardMetrics(width: number, height: number) {
  const board = Math.min(width * 0.78, height * 0.86);
  const gap = board * 0.025;
  const cell = (board - gap * 5) / 4;
  return {
    board,
    gap,
    cell,
    left: (width - board) / 2,
    top: (height - board) / 2,
  };
}

function drawFlower(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  petals: number,
) {
  context.save();
  context.translate(x, y);
  context.fillStyle = color;
  for (let index = 0; index < petals; index += 1) {
    context.rotate((Math.PI * 2) / petals);
    context.beginPath();
    context.ellipse(0, -radius * 0.42, radius * 0.32, radius * 0.58, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "#fff1c6";
  context.beginPath();
  context.arc(0, 0, radius * 0.24, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawMemory(canvas: HTMLCanvasElement, state: MemoryGardenState, quality: GameClientProps["quality"], flipProgress: number[]) {
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
  context.clearRect(0, 0, width, height);
  // Background Gradient (Mystic Garden)
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#1c2b2d");
  gradient.addColorStop(1, "#111a1c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const metrics = cardMetrics(width, height);
  state.cards.forEach((card, index) => {
    const x = metrics.left + metrics.gap + (index % 4) * (metrics.cell + metrics.gap);
    const y = metrics.top + metrics.gap + Math.floor(index / 4) * (metrics.cell + metrics.gap);
    
    const flip = flipProgress[index];
    const isFaceUp = flip > 0.5;
    const scaleX = Math.max(0.01, Math.abs(flip - 0.5) * 2);
    
    context.save();
    context.translate(x + metrics.cell / 2, y + metrics.cell / 2);
    context.scale(scaleX, 1);
    context.translate(-(x + metrics.cell / 2), -(y + metrics.cell / 2));

    context.fillStyle = isFaceUp ? "rgba(255,250,238,.94)" : "rgba(38,70,83,.6)";
    context.strokeStyle = index === state.cursor ? "#e9c46a" : "rgba(255,255,255,.1)";
    context.lineWidth = index === state.cursor ? Math.max(2, metrics.cell * 0.04) : 1;
    
    if (index === state.cursor) {
      context.shadowBlur = 15;
      context.shadowColor = "#e9c46a";
    } else {
      context.shadowBlur = 5;
      context.shadowColor = "rgba(0,0,0,0.5)";
    }
    
    context.beginPath();
    context.roundRect(x, y, metrics.cell, metrics.cell, metrics.cell * 0.16);
    context.fill();
    context.stroke();
    
    context.shadowBlur = 0; // reset shadow for contents
    
    if (isFaceUp) {
      const [color, petals] = flowers[card.pair];
      context.shadowBlur = 20;
      context.shadowColor = color; // Glowing flower
      drawFlower(context, x + metrics.cell / 2, y + metrics.cell / 2, metrics.cell * 0.28, color, petals);
      context.shadowBlur = 0;
    } else {
      // Card back pattern
      context.fillStyle = "rgba(233, 196, 106, 0.15)";
      context.beginPath();
      context.arc(x + metrics.cell / 2, y + metrics.cell / 2, metrics.cell * 0.12, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  });
}

function generatePracticeSeed() {
  return "practice-" + Math.random().toString(36).slice(2);
}

export default function MemoryGardenGame({
  onEngineStatusChange,
  quality = "balanced",
  signedIn,
}: GameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Start with a local practice seed just to draw the initial ready state
  const [currentSeed, setCurrentSeed] = useState(generatePracticeSeed());
  const stateRef = useRef(createMemoryGardenState(currentSeed));
  const actionRef = useRef<Array<{ type: "cursor"; dx: number; dy: number } | { type: "reveal"; index?: number }>>([]);
  
  const traceRef = useRef<GameInputAction[]>([]);
  const sessionRef = useRef<{ id: string; nonce: string; seed: string } | null>(null);

  const runtimeRef = useRef<ReturnType<typeof createFixedStepRuntime> | null>(null);
  const flipProgressRef = useRef<number[]>(new Array(16).fill(0));
  
  const [status, setStatus] = useState<"ready" | "running" | "paused" | "complete">("ready");
  const [score, setScore] = useState("0 / 8");
  const [completion, setCompletion] = useState<FinalizeGameSessionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const { playEffect, start: startAudio } = useGameAudio();

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

  const reveal = useCallback((index?: number) => {
    actionRef.current.push({ type: "reveal", index });
  }, []);
  
  const moveCursor = useCallback((dx: number, dy: number) => {
    actionRef.current.push({ type: "cursor", dx, dy });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dirty = true;
    
    const stepMs = 1000 / 60; // Physics ALWAYS runs at 60Hz for deterministic server verification
    const targetRenderFps = quality === "high" ? 120 : quality === "balanced" ? 60 : 30;

    const runtime = createFixedStepRuntime({
      stepMs,
      targetRenderFps,
      onTick(tick) {
        const action = actionRef.current.shift();
        if (action?.type === "cursor") {
          moveMemoryCursor(stateRef.current, action.dx, action.dy);
          dirty = true;
        }
        if (action?.type === "reveal") {
          const index = action.index ?? stateRef.current.cursor;
          const before = stateRef.current.pairs;
          const changed = revealMemoryCard(stateRef.current, index, tick);
          if (changed) {
            traceRef.current.push({ tick, type: "reveal", payload: index });
            playEffect(stateRef.current.pairs > before ? 720 : 460);
            setScore(`${stateRef.current.pairs} / 8`);
            dirty = true;
          }
        }
        if (stepMemoryGarden(stateRef.current, tick)) dirty = true;
        if (stateRef.current.complete) {
          runtime.pause();
          setStatus("complete");
          onEngineStatusChange?.("paused");
        }
        
        // Update 3D flip animations
        stateRef.current.cards.forEach((card, i) => {
          const target = (card.revealed || card.matched) ? 1 : 0;
          if (flipProgressRef.current[i] !== target) {
            const diff = target - flipProgressRef.current[i];
            const step = quality === "high" ? 0.05 : 0.1;
            flipProgressRef.current[i] += Math.sign(diff) * step;
            if (Math.abs(flipProgressRef.current[i] - target) < step) {
              flipProgressRef.current[i] = target;
            }
            dirty = true;
          }
        });
      },
      onRender() {
        if (!dirty) return;
        drawMemory(canvas, stateRef.current, quality, flipProgressRef.current);
        dirty = false;
      },
    });
    runtimeRef.current = runtime;
    drawMemory(canvas, stateRef.current, quality, flipProgressRef.current);
    
    const onKeyDown = (event: KeyboardEvent) => {
      const move = ({
        ArrowUp: [0, -1],
        w: [0, -1],
        ArrowDown: [0, 1],
        s: [0, 1],
        ArrowLeft: [-1, 0],
        a: [-1, 0],
        ArrowRight: [1, 0],
        d: [1, 0],
      } as Record<string, [number, number] | undefined>)[event.key];
      if (move) {
        event.preventDefault();
        moveCursor(move[0], move[1]);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        reveal();
      } else if (event.key === "Escape" || event.key === "p" || event.key === "P") {
        event.preventDefault();
        togglePause();
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const scaleX = canvas.width / bounds.width;
      const scaleY = canvas.height / bounds.height;
      const x = (event.clientX - bounds.left) * scaleX;
      const y = (event.clientY - bounds.top) * scaleY;
      const metrics = cardMetrics(canvas.width, canvas.height);
      const column = Math.floor((x - metrics.left - metrics.gap) / (metrics.cell + metrics.gap));
      const row = Math.floor((y - metrics.top - metrics.gap) / (metrics.cell + metrics.gap));
      if (column < 0 || column > 3 || row < 0 || row > 3) return;
      stateRef.current.cursor = row * 4 + column;
      reveal(row * 4 + column);
    };
    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("pointerup", onPointerUp);
    const observer = new ResizeObserver(() => drawMemory(canvas, stateRef.current, quality, flipProgressRef.current));
    observer.observe(canvas);
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [moveCursor, onEngineStatusChange, playEffect, quality, reveal, togglePause]);

  const start = useCallback(async () => {
    void startAudio();
    
    if (status === "complete" || status === "ready") {
      setCompletion(null);
      setScore("0 / 8");
      actionRef.current = [];
      traceRef.current = [];
      
      let nextSeed = generatePracticeSeed();
      
      if (signedIn) {
        try {
          const response = await fetch("/api/game-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameSlug: "memory-garden", difficultyKey: typeof difficulty !== "undefined" ? difficulty : "standard" }),
          });
          if (response.ok) {
            const { data } = await response.json();
            nextSeed = data.seed;
            sessionRef.current = { id: data.sessionId, nonce: data.nonce, seed: data.seed };
          } else {
            sessionRef.current = null; // fallback to practice
          }
        } catch (e) {
          sessionRef.current = null;
        }
      }
      
      setCurrentSeed(nextSeed);
      stateRef.current = createMemoryGardenState(nextSeed);
      runtimeRef.current?.reset();
    }
    
    runtimeRef.current?.start();
    setStatus("running");
    onEngineStatusChange?.("running");
  }, [onEngineStatusChange, signedIn, startAudio, status]);


  const restart = useCallback(() => {
    runtimeRef.current?.pause();
    runtimeRef.current?.reset();
    actionRef.current = [];
    traceRef.current = [];
    sessionRef.current = null;
    
    const nextSeed = generatePracticeSeed();
    setCurrentSeed(nextSeed);
    stateRef.current = createMemoryGardenState(nextSeed);
    
    setScore("0 / 8");
    setStatus("ready");
    setCompletion(null);
    onEngineStatusChange?.("ready");
    
    flipProgressRef.current = new Array(16).fill(0);
    const canvas = canvasRef.current;
    if (canvas) drawMemory(canvas, stateRef.current, quality, flipProgressRef.current);
  }, [onEngineStatusChange, quality]);

  useEffect(() => {
    if (status === "complete" && sessionRef.current && !completion && !submitting) {
      setSubmitting(true);
      const session = sessionRef.current;
      const trace: GameReplayTrace = {
        formatVersion: 1,
        engineVersion: "memory-garden-v1",
        seed: session.seed,
        fixedStepMs: 1000 / 60,
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
          sessionRef.current = null; // consume session
        });
    }
  }, [status, completion, submitting, quality]);

  return (
    <GameSurface
      canvasRef={canvasRef}
      title="Memory Garden"
      status={status}
      score={score}
      detail="Click or tap cards to reveal botanical pairs. Keyboard players can move with arrows or WASD and reveal with Enter."
      onStart={start}
      onPause={pause}
      onRestart={restart}
    >
      {completion && (
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
      {!completion && status === "complete" && !signedIn && (
        <div className="mt-2 rounded-xl bg-surface/50 p-4 text-center text-sm text-text-secondary">
          Practice session complete.
        </div>
      )}
    </GameSurface>
  );
}

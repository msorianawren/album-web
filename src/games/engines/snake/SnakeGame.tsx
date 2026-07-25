"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameSurface } from "@/components/games/GameSurface";
import { Button } from "@/components/ui/Button";
import { useGameAudio } from "@/games/core/audio-context.client";
import { createFixedStepRuntime } from "@/games/core/runtime";
import type { GameClientProps, FinalizeGameSessionResponse, GameInputAction, GameReplayTrace } from "@/games/core/types";
import {
  createSnakeState,
  queueSnakeDirection,
  stepSnake,
  type SnakeDirection,
  type SnakePoint,
  type SnakeState,
} from "./model";

function drawSnake(
  canvas: HTMLCanvasElement,
  state: SnakeState,
  quality: GameClientProps["quality"],
  previousBody: SnakePoint[],
  interpolation: number
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
  
  // Base dark background outside the grid
  context.fillStyle = "#0d1410";
  context.fillRect(0, 0, width, height);
  
  // Draw Grass Checkerboard
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      // Checkerboard pattern of rich grass colors
      const isEven = (x + y) % 2 === 0;
      context.fillStyle = isEven ? "#2e5033" : "#27442b"; 
      context.fillRect(offsetX + x * cell, offsetY + y * cell, cell + 0.5, cell + 0.5);
    }
  }

  // Draw a subtle border around the play area
  context.strokeStyle = "rgba(255,255,255,.05)";
  context.lineWidth = 1;
  context.strokeRect(offsetX, offsetY, state.width * cell, state.height * cell);

  // Calculate interpolated positions
  // If the game is complete, don't interpolate further than 1
  const t = state.complete ? 1 : Math.max(0, Math.min(1, interpolation));
  
  const getInterpolated = (prev: SnakePoint | undefined, curr: SnakePoint) => {
    if (!prev) return { x: curr.x, y: curr.y };
    // If the distance is > 1 (e.g. wrapped or teleported), don't interpolate
    if (Math.abs(curr.x - prev.x) > 1 || Math.abs(curr.y - prev.y) > 1) {
      return { x: curr.x, y: curr.y };
    }
    return {
      x: prev.x + (curr.x - prev.x) * t,
      y: prev.y + (curr.y - prev.y) * t
    };
  };

  const bodyPoints = state.body.map((segment, index) => {
    // A segment's previous position is where it was last tick.
    // In our logic, each segment moved to the position of the one before it,
    // so previousBody[index] holds its old location.
    const prev = previousBody[index] || segment;
    return getInterpolated(prev, segment);
  });

  if (bodyPoints.length > 0) {
    const head = bodyPoints[0];
    
    // Draw Snake Body Path
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = cell * 0.76;
    context.shadowColor = "rgba(255, 247, 232, 0.4)";
    context.shadowBlur = cell * 0.5;

    // We draw from tail to head
    for (let i = bodyPoints.length - 1; i > 0; i--) {
      const start = bodyPoints[i];
      const end = bodyPoints[i - 1];
      
      if (Math.abs(start.x - end.x) > 1.5 || Math.abs(start.y - end.y) > 1.5) continue;

      context.beginPath();
      context.moveTo(offsetX + start.x * cell + cell * 0.5, offsetY + start.y * cell + cell * 0.5);
      context.lineTo(offsetX + end.x * cell + cell * 0.5, offsetY + end.y * cell + cell * 0.5);
      context.strokeStyle = `rgba(218, 236, 209, ${Math.max(0.45, 1 - i * 0.035)})`;
      context.stroke();
    }

    // Draw Head
    context.shadowBlur = cell * 0.8;
    context.shadowColor = "rgba(255, 247, 232, 0.8)";
    context.fillStyle = "#fff7e8";
    context.beginPath();
    context.arc(
      offsetX + head.x * cell + cell * 0.5, 
      offsetY + head.y * cell + cell * 0.5, 
      cell * 0.38, 
      0, 
      Math.PI * 2
    );
    context.fill();

    // Draw Eyes
    context.shadowBlur = 0;
    context.fillStyle = "#17271f";
    const eyeOffset = cell * 0.15;
    const eyeRadius = cell * 0.08;
    
    let dx = 0;
    let dy = 0;
    if (state.direction === "up") dy = -1;
    if (state.direction === "down") dy = 1;
    if (state.direction === "left") dx = -1;
    if (state.direction === "right") dx = 1;

    // Normal to direction
    const nx = dy;
    const ny = -dx;

    context.beginPath();
    context.arc(
      offsetX + head.x * cell + cell * 0.5 + dx * eyeOffset + nx * eyeOffset,
      offsetY + head.y * cell + cell * 0.5 + dy * eyeOffset + ny * eyeOffset,
      eyeRadius, 0, Math.PI * 2
    );
    context.fill();

    context.beginPath();
    context.arc(
      offsetX + head.x * cell + cell * 0.5 + dx * eyeOffset - nx * eyeOffset,
      offsetY + head.y * cell + cell * 0.5 + dy * eyeOffset - ny * eyeOffset,
      eyeRadius, 0, Math.PI * 2
    );
    context.fill();
  }

  // Draw Detailed Berry (Food)
  const pulse = Math.sin(performance.now() / 200) * 0.05 + 0.95;
  const foodCenterX = offsetX + (state.food.x + 0.5) * cell;
  const foodCenterY = offsetY + (state.food.y + 0.5) * cell;
  const foodRadius = cell * 0.32 * pulse;
  
  context.shadowBlur = cell * 0.5 * pulse;
  context.shadowColor = "rgba(255, 100, 120, 0.6)";
  
  // Berry body
  context.fillStyle = "#ff4d6d";
  context.beginPath();
  context.arc(foodCenterX, foodCenterY, foodRadius, 0, Math.PI * 2);
  context.fill();
  
  context.shadowBlur = 0;
  
  // Berry highlight (shiny effect)
  context.fillStyle = "rgba(255, 255, 255, 0.5)";
  context.beginPath();
  context.ellipse(foodCenterX - foodRadius * 0.3, foodCenterY - foodRadius * 0.3, foodRadius * 0.3, foodRadius * 0.15, -Math.PI / 4, 0, Math.PI * 2);
  context.fill();
  
  // Berry leaf
  context.fillStyle = "#74c69d";
  context.beginPath();
  context.ellipse(foodCenterX + foodRadius * 0.2, foodCenterY - foodRadius * 0.7, foodRadius * 0.4, foodRadius * 0.15, Math.PI / 4, 0, Math.PI * 2);
  context.fill();
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
  
  const [currentSeed, setCurrentSeed] = useState(generatePracticeSeed());
  const stateRef = useRef(createSnakeState(currentSeed));
  const runtimeRef = useRef<ReturnType<typeof createFixedStepRuntime> | null>(null);
  
  const sessionRef = useRef<{ id: string; nonce: string; seed: string } | null>(null);
  const traceRef = useRef<GameInputAction[]>([]);
  const actionQueueRef = useRef<Array<{ tick: number, dir: SnakeDirection }>>([]);
  const previousBodyRef = useRef<SnakePoint[]>([]);

  const [status, setStatus] = useState<"ready" | "running" | "paused" | "complete">("ready");
  const [score, setScore] = useState(0);
  const [completion, setCompletion] = useState<FinalizeGameSessionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { playEffect, start: startAudio } = useGameAudio();

  const setDirection = useCallback((direction: SnakeDirection) => {
    if (!runtimeRef.current) return;
    const tick = runtimeRef.current.tick;
    actionQueueRef.current.push({ tick, dir: direction });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const runtime = createFixedStepRuntime({
      stepMs: quality === "low" ? 125 : 100,
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
        
        const previousScore = stateRef.current.score;
        stepSnake(stateRef.current);
        if (stateRef.current.score !== previousScore) {
          setScore(stateRef.current.score);
          playEffect(660);
        }
        if (stateRef.current.complete) {
          runtime.pause();
          setStatus("complete");
          onEngineStatusChange?.("paused");
          playEffect(180, 0.2);
        }
      },
      onRender(interpolation) {
        drawSnake(canvas, stateRef.current, quality, previousBodyRef.current, interpolation);
      },
    });
    runtimeRef.current = runtime;
    drawSnake(canvas, stateRef.current, quality, previousBodyRef.current, 1);
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
      if (!direction) return;
      event.preventDefault();
      setDirection(direction);
    };
    window.addEventListener("keydown", onKeyDown);
    const observer = new ResizeObserver(() => drawSnake(canvas, stateRef.current, quality, previousBodyRef.current, 1));
    observer.observe(canvas);
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onEngineStatusChange, playEffect, quality, setDirection]);

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
            body: JSON.stringify({ gameSlug: "snake" }),
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
    }
    
    runtimeRef.current?.start();
    setStatus("running");
    onEngineStatusChange?.("running");
  }, [onEngineStatusChange, signedIn, startAudio, status]);

  const pause = useCallback(() => {
    runtimeRef.current?.pause();
    setStatus("paused");
    onEngineStatusChange?.("paused");
  }, [onEngineStatusChange]);

  const restart = useCallback(() => {
    runtimeRef.current?.pause();
    runtimeRef.current?.reset();
    actionQueueRef.current = [];
    traceRef.current = [];
    sessionRef.current = null;

    const nextSeed = generatePracticeSeed();
    setCurrentSeed(nextSeed);
    stateRef.current = createSnakeState(nextSeed);
    
    setScore(0);
    setStatus("ready");
    setCompletion(null);
    onEngineStatusChange?.("ready");
    const canvas = canvasRef.current;
    if (canvas) {
      previousBodyRef.current = stateRef.current.body.map(p => ({ ...p }));
      drawSnake(canvas, stateRef.current, quality, previousBodyRef.current, 1);
    }
  }, [onEngineStatusChange, quality]);

  useEffect(() => {
    if (status === "complete" && sessionRef.current && !completion && !submitting) {
      setSubmitting(true);
      const session = sessionRef.current;
      const trace: GameReplayTrace = {
        formatVersion: 1,
        engineVersion: "snake-v1",
        seed: session.seed,
        fixedStepMs: quality === "low" ? 125 : 100,
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
          }
        })
        .finally(() => {
          setSubmitting(false);
          sessionRef.current = null;
        });
    }
  }, [status, completion, submitting, quality]);

  return (
    <GameSurface
      canvasRef={canvasRef}
      title="Wren Trail Snake"
      status={status}
      score={String(score)}
      detail="Use arrow keys, WASD, or the directional controls. Collect rose berries without touching the garden edge."
      onStart={start}
      onPause={pause}
      onRestart={restart}
    >
      <div className="grid grid-cols-3 gap-2" aria-label="Snake touch controls">
        <span />
        <Button variant="icon" aria-label="Move up" onClick={() => setDirection("up")}><ArrowUp className="h-4 w-4" /></Button>
        <span />
        <Button variant="icon" aria-label="Move left" onClick={() => setDirection("left")}><ArrowLeft className="h-4 w-4" /></Button>
        <Button variant="icon" aria-label="Move down" onClick={() => setDirection("down")}><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="icon" aria-label="Move right" onClick={() => setDirection("right")}><ArrowRight className="h-4 w-4" /></Button>
      </div>
      
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

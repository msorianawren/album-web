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
  type SnakeState,
} from "./model";

function drawSnake(canvas: HTMLCanvasElement, state: SnakeState, quality: GameClientProps["quality"]) {
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
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#17271f");
  gradient.addColorStop(1, "#38483d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(255,255,255,.045)";
  context.lineWidth = 1;
  for (let x = 0; x <= state.width; x += 1) {
    context.beginPath();
    context.moveTo(offsetX + x * cell, offsetY);
    context.lineTo(offsetX + x * cell, offsetY + state.height * cell);
    context.stroke();
  }
  for (let y = 0; y <= state.height; y += 1) {
    context.beginPath();
    context.moveTo(offsetX, offsetY + y * cell);
    context.lineTo(offsetX + state.width * cell, offsetY + y * cell);
    context.stroke();
  }
  state.body.forEach((segment, index) => {
    context.fillStyle = index === 0 ? "#fff7e8" : `rgba(218, 236, 209, ${Math.max(0.45, 1 - index * 0.035)})`;
    context.beginPath();
    context.roundRect(
      offsetX + segment.x * cell + cell * 0.12,
      offsetY + segment.y * cell + cell * 0.12,
      cell * 0.76,
      cell * 0.76,
      cell * 0.28,
    );
    context.fill();
  });
  context.fillStyle = "#f4a8b8";
  context.beginPath();
  context.arc(
    offsetX + (state.food.x + 0.5) * cell,
    offsetY + (state.food.y + 0.5) * cell,
    cell * 0.31,
    0,
    Math.PI * 2,
  );
  context.fill();
}

function generatePracticeSeed() {
  return "practice-" + Math.random().toString(36).slice(2);
}

export default function SnakeGame({
  onEngineStatusChange,
  quality = "balanced",
}: GameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentSeed, setCurrentSeed] = useState(generatePracticeSeed());
  const stateRef = useRef(createSnakeState(currentSeed));
  const runtimeRef = useRef<ReturnType<typeof createFixedStepRuntime> | null>(null);
  
  const sessionRef = useRef<{ id: string; nonce: string; seed: string } | null>(null);
  const traceRef = useRef<GameInputAction[]>([]);
  const actionQueueRef = useRef<Array<{ tick: number, dir: SnakeDirection }>>([]);

  const [status, setStatus] = useState<"ready" | "running" | "paused" | "complete">("ready");
  const [score, setScore] = useState(0);
  const [completion, setCompletion] = useState<FinalizeGameSessionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { playEffect, start: startAudio } = useGameAudio();

  const setDirection = useCallback((direction: SnakeDirection) => {
    if (status !== "running" || !runtimeRef.current) return;
    const tick = runtimeRef.current.tick;
    actionQueueRef.current.push({ tick, dir: direction });
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const runtime = createFixedStepRuntime({
      stepMs: quality === "low" ? 125 : 100,
      targetRenderFps: quality === "low" ? 30 : 60,
      onTick(tick) {
        // apply all queued directions up to this tick
        while (actionQueueRef.current.length > 0) {
          const action = actionQueueRef.current[0];
          queueSnakeDirection(stateRef.current, action.dir);
          traceRef.current.push({ tick, type: "direction", payload: action.dir });
          actionQueueRef.current.shift();
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
      onRender() {
        drawSnake(canvas, stateRef.current, quality);
      },
    });
    runtimeRef.current = runtime;
    drawSnake(canvas, stateRef.current, quality);
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
    const observer = new ResizeObserver(() => drawSnake(canvas, stateRef.current, quality));
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
      
      setCurrentSeed(nextSeed);
      stateRef.current = createSnakeState(nextSeed);
      runtimeRef.current?.reset();
    }
    
    runtimeRef.current?.start();
    setStatus("running");
    onEngineStatusChange?.("running");
  }, [onEngineStatusChange, startAudio, status]);

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
    if (canvas) drawSnake(canvas, stateRef.current, quality);
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
      {!completion && status === "complete" && !sessionRef.current && (
        <div className="mt-2 rounded-xl bg-surface/50 p-4 text-center text-sm text-text-secondary">
          Practice session complete.
        </div>
      )}
    </GameSurface>
  );
}

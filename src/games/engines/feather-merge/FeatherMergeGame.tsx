"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameSurface } from "@/components/games/GameSurface";
import { Button } from "@/components/ui/Button";
import { useGameAudio } from "@/games/core/audio-context.client";
import { createFixedStepRuntime } from "@/games/core/runtime";
import type { GameClientProps, FinalizeGameSessionResponse, GameInputAction, GameReplayTrace } from "@/games/core/types";
import {
  createFeatherMergeState,
  moveFeatherMerge,
  type FeatherMergeState,
  type MergeDirection,
} from "./model";

const palette: Record<number, string> = {
  0: "rgba(255,255,255,.14)",
  2: "#f8e8dd",
  4: "#f6d4c6",
  8: "#eeb8b0",
  16: "#d99c99",
  32: "#c17f82",
  64: "#9d6874",
  128: "#7f5c70",
  256: "#65516a",
  512: "#4c435d",
  1024: "#37364f",
  2048: "#24283d",
};

function drawMerge(canvas: HTMLCanvasElement, state: FeatherMergeState, quality: GameClientProps["quality"]) {
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
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fff5e7");
  gradient.addColorStop(1, "#cfb792");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const board = Math.min(width, height) * 0.82;
  const gap = board * 0.025;
  const cell = (board - gap * 5) / 4;
  const left = (width - board) / 2;
  const top = (height - board) / 2;
  context.fillStyle = "rgba(55,44,35,.22)";
  context.beginPath();
  context.roundRect(left, top, board, board, board * 0.045);
  context.fill();
  state.cells.forEach((value, index) => {
    const x = left + gap + (index % 4) * (cell + gap);
    const y = top + gap + Math.floor(index / 4) * (cell + gap);
    context.fillStyle = palette[value] ?? "#1d2436";
    context.beginPath();
    context.roundRect(x, y, cell, cell, cell * 0.14);
    context.fill();
    if (value) {
      context.fillStyle = value >= 64 ? "#fffaf0" : "#45382f";
      context.font = `600 ${Math.max(16, cell * (value >= 1000 ? 0.26 : value >= 100 ? 0.32 : 0.4))}px Georgia`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(value), x + cell / 2, y + cell / 2);
    }
  });
}

function generatePracticeSeed() {
  return "practice-" + Math.random().toString(36).slice(2);
}

export default function FeatherMergeGame({
  onEngineStatusChange,
  quality = "balanced",
}: GameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentSeed, setCurrentSeed] = useState(generatePracticeSeed());
  const stateRef = useRef(createFeatherMergeState(currentSeed));
  const runtimeRef = useRef<ReturnType<typeof createFixedStepRuntime> | null>(null);
  
  const sessionRef = useRef<{ id: string; nonce: string; seed: string } | null>(null);
  const traceRef = useRef<GameInputAction[]>([]);
  const inputRef = useRef<MergeDirection[]>([]);

  const [status, setStatus] = useState<"ready" | "running" | "paused" | "complete">("ready");
  const [score, setScore] = useState(0);
  const [completion, setCompletion] = useState<FinalizeGameSessionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { playEffect, start: startAudio } = useGameAudio();

  const queueMove = useCallback((direction: MergeDirection) => {
    if (status !== "running" || !runtimeRef.current) return;
    inputRef.current.push(direction);
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dirty = true;
    const runtime = createFixedStepRuntime({
      stepMs: quality === "low" ? 1000 / 30 : 1000 / 60,
      targetRenderFps: quality === "low" ? 30 : 60,
      onTick(tick) {
        const direction = inputRef.current.shift();
        if (!direction) return;
        
        traceRef.current.push({ tick, type: "direction", payload: direction });
        
        if (moveFeatherMerge(stateRef.current, direction)) {
          setScore(stateRef.current.score);
          playEffect(420 + Math.min(460, stateRef.current.score / 4));
          dirty = true;
        }
        if (stateRef.current.complete) {
          runtime.pause();
          setStatus("complete");
          onEngineStatusChange?.("paused");
        }
      },
      onRender() {
        if (!dirty) return;
        drawMerge(canvas, stateRef.current, quality);
        dirty = false;
      },
    });
    runtimeRef.current = runtime;
    drawMerge(canvas, stateRef.current, quality);
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
      } as Record<string, MergeDirection | undefined>)[event.key];
      if (!direction) return;
      event.preventDefault();
      queueMove(direction);
    };
    let startPoint: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      startPoint = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!startPoint) return;
      const dx = event.clientX - startPoint.x;
      const dy = event.clientY - startPoint.y;
      startPoint = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      queueMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    };
    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    const observer = new ResizeObserver(() => {
      drawMerge(canvas, stateRef.current, quality);
      dirty = false;
    });
    observer.observe(canvas);
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [onEngineStatusChange, playEffect, quality, queueMove]);

  const start = useCallback(async () => {
    void startAudio();

    if (status === "complete" || status === "ready") {
      setCompletion(null);
      setScore(0);
      inputRef.current = [];
      traceRef.current = [];

      let nextSeed = generatePracticeSeed();
      
      try {
        const response = await fetch("/api/game-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameSlug: "feather-merge" }),
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
      stateRef.current = createFeatherMergeState(nextSeed);
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
    inputRef.current = [];
    traceRef.current = [];
    sessionRef.current = null;

    const nextSeed = generatePracticeSeed();
    setCurrentSeed(nextSeed);
    stateRef.current = createFeatherMergeState(nextSeed);
    
    setScore(0);
    setStatus("ready");
    setCompletion(null);
    onEngineStatusChange?.("ready");
    const canvas = canvasRef.current;
    if (canvas) drawMerge(canvas, stateRef.current, quality);
  }, [onEngineStatusChange, quality]);

  useEffect(() => {
    if (status === "complete" && sessionRef.current && !completion && !submitting) {
      setSubmitting(true);
      const session = sessionRef.current;
      const trace: GameReplayTrace = {
        formatVersion: 1,
        engineVersion: "feather-merge-v1",
        seed: session.seed,
        fixedStepMs: quality === "low" ? 1000 / 30 : 1000 / 60,
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
      title="Feather Merge"
      status={status}
      score={String(score)}
      detail="Swipe, use arrow keys, WASD, or the controls to merge equal feathers. Reach 2048 without filling the board."
      onStart={start}
      onPause={pause}
      onRestart={restart}
    >
      <div className="grid grid-cols-3 gap-2" aria-label="Feather Merge controls">
        <span />
        <Button variant="icon" aria-label="Move up" onClick={() => queueMove("up")}><ArrowUp className="h-4 w-4" /></Button>
        <span />
        <Button variant="icon" aria-label="Move left" onClick={() => queueMove("left")}><ArrowLeft className="h-4 w-4" /></Button>
        <Button variant="icon" aria-label="Move down" onClick={() => queueMove("down")}><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="icon" aria-label="Move right" onClick={() => queueMove("right")}><ArrowRight className="h-4 w-4" /></Button>
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

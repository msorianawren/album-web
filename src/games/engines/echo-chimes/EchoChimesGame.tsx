"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { GameSurface } from "@/components/games/GameSurface";
import { useGameAudio } from "@/games/core/audio-context.client";
import { createFixedStepRuntime } from "@/games/core/runtime";
import type { GameClientProps, GameInputAction, GameReplayTrace, FinalizeGameSessionResponse } from "@/games/core/types";
import {
  createEchoChimesState,
  stepEchoChimes,
  pressChime,
  type EchoChimesState,
} from "./model";

const CHIME_COLORS = [
  "#d4a373", // Copper
  "#e0e1dd", // Silver
  "#cd7f32", // Bronze
  "#8ecae6", // Glass
];

const CHIME_PITCHES = [
  440, // A4
  554.37, // C#5
  659.25, // E5
  880, // A5
];

function drawChimes(canvas: HTMLCanvasElement, state: EchoChimesState, quality: GameClientProps["quality"]) {
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

  // Background
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1f2937");
  gradient.addColorStop(1, "#111827");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // Draw 4 chimes
  const chimeWidth = width * 0.15;
  const spacing = width * 0.05;
  const startX = (width - (4 * chimeWidth + 3 * spacing)) / 2;

  for (let i = 0; i < 4; i++) {
    const x = startX + i * (chimeWidth + spacing);
    const y = height * 0.2;
    const chimeHeight = height * 0.5 + (i % 2 === 0 ? height * 0.1 : 0); // slight variation in length

    // Draw string
    context.strokeStyle = "rgba(255,255,255,0.2)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x + chimeWidth / 2, 0);
    context.lineTo(x + chimeWidth / 2, y);
    context.stroke();

    // Draw Chime
    const isActive = state.activeChime === i;
    
    context.fillStyle = CHIME_COLORS[i];
    if (isActive) {
      context.shadowColor = CHIME_COLORS[i];
      context.shadowBlur = 20;
    } else {
      context.shadowBlur = 0;
    }

    context.beginPath();
    context.roundRect(x, y, chimeWidth, chimeHeight, chimeWidth / 2);
    context.fill();

    // Highlight
    context.fillStyle = "rgba(255,255,255,0.3)";
    context.beginPath();
    context.roundRect(x + chimeWidth * 0.1, y + 10, chimeWidth * 0.2, chimeHeight - 20, chimeWidth / 4);
    context.fill();
    
    context.shadowBlur = 0;
  }
}

function generatePracticeSeed() {
  return "practice-" + Math.random().toString(36).slice(2);
}

export default function EchoChimesGame({
  onEngineStatusChange,
  quality = "balanced",
  signedIn,
}: GameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentSeed, setCurrentSeed] = useState("practice-initial");
  const stateRef = useRef(createEchoChimesState(currentSeed));
  const actionRef = useRef<Array<{ type: "press"; index: number }>>([]);
  
  const traceRef = useRef<GameInputAction[]>([]);
  const sessionRef = useRef<{ id: string; nonce: string; seed: string } | null>(null);

  const runtimeRef = useRef<ReturnType<typeof createFixedStepRuntime> | null>(null);
  const [status, setStatus] = useState<"ready" | "running" | "paused" | "complete">("ready");
  const [score, setScore] = useState(0);
  const [completion, setCompletion] = useState<FinalizeGameSessionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const { start: startAudio, playEffect } = useGameAudio();

  const playChimeAudio = useCallback((index: number) => {
    playEffect(CHIME_PITCHES[index], 1.5);
  }, [playEffect]);

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

  const handlePress = useCallback((index: number) => {
    actionRef.current.push({ type: "press", index });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dirty = true;
    let lastActiveChime: number | null = null;

    const runtime = createFixedStepRuntime({
      stepMs: quality === "low" ? 1000 / 30 : 1000 / 60,
      targetRenderFps: quality === "low" ? 30 : 60,
      onTick(tick) {
        const action = actionRef.current.shift();
        if (action?.type === "press") {
          const valid = pressChime(stateRef.current, action.index);
          if (valid || stateRef.current.phase === "game_over") {
            traceRef.current.push({ tick, type: "press", payload: action.index });
            setScore(stateRef.current.score);
            dirty = true;
          }
        }
        
        stepEchoChimes(stateRef.current);
        
        if (stateRef.current.activeChime !== lastActiveChime) {
          lastActiveChime = stateRef.current.activeChime;
          if (lastActiveChime !== null) {
            playChimeAudio(lastActiveChime);
          }
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
        drawChimes(canvas, stateRef.current, quality);
        dirty = false;
      },
    });
    runtimeRef.current = runtime;
    drawChimes(canvas, stateRef.current, quality);
    
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "1") handlePress(0);
      else if (event.key === "2") handlePress(1);
      else if (event.key === "3") handlePress(2);
      else if (event.key === "4") handlePress(3);
      else if (event.key === "Escape" || event.key === "p" || event.key === "P") {
        event.preventDefault();
        togglePause();
      }
    };
    
    const onPointerDown = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const scaleX = canvas.width / bounds.width;
      const x = (event.clientX - bounds.left) * scaleX;
      
      const width = canvas.width;
      const chimeWidth = width * 0.15;
      const spacing = width * 0.05;
      const startX = (width - (4 * chimeWidth + 3 * spacing)) / 2;
      
      for (let i = 0; i < 4; i++) {
        const cx = startX + i * (chimeWidth + spacing);
        if (x >= cx && x <= cx + chimeWidth) {
          handlePress(i);
          break;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("pointerdown", onPointerDown);
    const observer = new ResizeObserver(() => drawChimes(canvas, stateRef.current, quality));
    observer.observe(canvas);
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [handlePress, onEngineStatusChange, playChimeAudio, quality, togglePause]);

  const start = useCallback(async () => {
    void startAudio();
    
    if (status === "complete" || status === "ready") {
      setCompletion(null);
      setScore(0);
      actionRef.current = [];
      traceRef.current = [];
      
      let nextSeed = generatePracticeSeed();
      
      if (signedIn) {
        try {
          const response = await fetch("/api/game-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameSlug: "echo-chimes" }),
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
      stateRef.current = createEchoChimesState(nextSeed);
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
    stateRef.current = createEchoChimesState(nextSeed);
    
    setScore(0);
    setStatus("ready");
    setCompletion(null);
    onEngineStatusChange?.("ready");
    const canvas = canvasRef.current;
    if (canvas) drawChimes(canvas, stateRef.current, quality);
  }, [onEngineStatusChange, quality]);

  useEffect(() => {
    if (status === "complete" && sessionRef.current && !completion && !submitting) {
      setSubmitting(true);
      const session = sessionRef.current;
      const trace: GameReplayTrace = {
        formatVersion: 1,
        engineVersion: "echo-chimes-v1",
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
      title="Echo Chimes"
      status={status}
      score={String(score)}
      detail="Listen to the wind chimes and repeat their delicate melody. Keyboard players can use keys 1, 2, 3, 4."
      onStart={start}
      onPause={pause}
      onRestart={restart}
    >
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
          Target of 8 sequence length not reached. No feathers awarded.
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { GameSurface } from "@/components/games/GameSurface";
import { useGameAudio } from "@/games/core/audio-context.client";
import { createFixedStepRuntime } from "@/games/core/runtime";
import type { GameClientProps, GameInputAction, GameReplayTrace, FinalizeGameSessionResponse } from "@/games/core/types";
import {
  createWrenFlightState,
  stepWrenFlight,
  flapWren,
  type WrenFlightState,
} from "./model";

const WREN_X = 30;
const WREN_RADIUS = 3;
const OBSTACLE_WIDTH = 8;
const GAP_SIZE = 35;

function drawWrenFlight(
  canvas: HTMLCanvasElement, 
  state: WrenFlightState, 
  quality: GameClientProps["quality"],
  prevState?: WrenFlightState,
  interpolation = 1
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
  context.clearRect(0, 0, width, height);

  // Background Gradient (Vibrant Sky/Canopy)
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#4a90e2"); // Sky blue
  gradient.addColorStop(1, "#84a98c"); // Canopy green
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // Parallax Clouds/Background elements (pseudo-random based on state.tickCounter)
  context.fillStyle = "rgba(255, 255, 255, 0.15)";
  for (let i = 0; i < 3; i++) {
    const cloudX = (width + ((i * 300 - state.tickCounter * (1 + i)) % (width + 200))) - 100;
    const cloudY = height * 0.2 + (i * 50);
    context.beginPath();
    context.ellipse(cloudX, cloudY, 80 + i * 20, 25 + i * 10, 0, 0, Math.PI * 2);
    context.fill();
  }

  const t = state.complete ? 1 : Math.max(0, Math.min(1, interpolation));

  // Draw obstacles (vines/bamboo)
  context.fillStyle = "#2f3e46"; // Dark green/grey stalks
  
  for (let i = 0; i < state.obstacles.length; i++) {
    const obs = state.obstacles[i];
    const prevObs = prevState?.obstacles.find(o => o.gapY === obs.gapY);
    
    // Interpolate X position
    const obsX = prevObs ? prevObs.x + (obs.x - prevObs.x) * t : obs.x;
    
    const x = (obsX / 100) * width;
    const w = (OBSTACLE_WIDTH / 100) * width;
    const gapCenter = (obs.gapY / 100) * height;
    const gapHalf = (GAP_SIZE / 200) * height;

    // Top vine
    const topGradient = context.createLinearGradient(x, 0, x + w, 0);
    topGradient.addColorStop(0, "#2d6a4f");
    topGradient.addColorStop(1, "#1b4332");
    context.fillStyle = topGradient;
    context.beginPath();
    context.roundRect(x, -10, w, gapCenter - gapHalf + 10, w/3);
    context.fill();

    // Bottom vine
    context.beginPath();
    context.roundRect(x, gapCenter + gapHalf, w, height - (gapCenter + gapHalf) + 10, w/3);
    context.fill();
  }

  // Draw Wren
  const prevY = prevState?.wrenY ?? state.wrenY;
  const wrenY = prevY + (state.wrenY - prevY) * t;
  
  const x = (WREN_X / 100) * width;
  const y = (wrenY / 100) * height;
  const rX = (WREN_RADIUS / 100) * width;
  const rY = (WREN_RADIUS / 100) * height;

  context.fillStyle = "#f4a261"; // Orange/Amber bird
  context.beginPath();
  context.ellipse(x, y, rX, rY, 0, 0, Math.PI * 2);
  context.fill();
  
  // Eye
  context.fillStyle = "#264653";
  context.beginPath();
  context.ellipse(x + rX * 0.4, y - rY * 0.2, rX * 0.2, rY * 0.2, 0, 0, Math.PI * 2);
  context.fill();
  
  // Ribbon tail
  context.strokeStyle = "#e9c46a";
  context.lineWidth = rY * 0.5;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(x - rX * 0.8, y);
  
  // Tail flap logic based on velocity and time
  const tailWave = Math.sin(state.tickCounter * 0.5) * rY * 0.5;
  const vOffset = (state.wrenVy * rY * 0.3);
  
  context.quadraticCurveTo(x - rX * 2, y + vOffset, x - rX * 3, y + tailWave - vOffset);
  context.stroke();
}

function generatePracticeSeed() {
  return "practice-" + Math.random().toString(36).slice(2);
}

export default function WrenFlightGame({
  onEngineStatusChange,
  quality = "balanced",
  signedIn,
}: GameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentSeed, setCurrentSeed] = useState("practice-initial");
  const stateRef = useRef(createWrenFlightState(currentSeed));
  const prevStateRef = useRef<WrenFlightState | undefined>(undefined);
  const actionRef = useRef<Array<{ type: "flap" }>>([]);
  
  const traceRef = useRef<GameInputAction[]>([]);
  const sessionRef = useRef<{ id: string; nonce: string; seed: string } | null>(null);

  const runtimeRef = useRef<ReturnType<typeof createFixedStepRuntime> | null>(null);
  const [status, setStatus] = useState<"ready" | "running" | "paused" | "complete">("ready");
  const [score, setScore] = useState(0);
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

  const handleFlap = useCallback(() => {
    actionRef.current.push({ type: "flap" });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Initial draw
    drawWrenFlight(canvas, stateRef.current, quality);

    const stepMs = 1000 / 60; // Physics ALWAYS runs at 60Hz for deterministic server verification
    const targetRenderFps = quality === "high" ? 120 : quality === "balanced" ? 60 : 30;

    const runtime = createFixedStepRuntime({
      stepMs,
      targetRenderFps,
      onTick(tick) {
        // deep clone state for interpolation
        prevStateRef.current = {
          ...stateRef.current,
          obstacles: stateRef.current.obstacles.map(o => ({ ...o }))
        };

        let didFlap = false;
        while (actionRef.current.length > 0) {
          actionRef.current.shift();
          didFlap = true;
        }

        if (didFlap) {
          flapWren(stateRef.current);
          traceRef.current.push({ tick, type: "flap", payload: null });
          playEffect(550, 0.5); // Short flap sound
        }
        
        const prevScore = stateRef.current.score;
        stepWrenFlight(stateRef.current);
        
        if (stateRef.current.score > prevScore) {
          setScore(stateRef.current.score);
          playEffect(660); // Score sound
        }

        if (stateRef.current.complete) {
          runtime.pause();
          setStatus("complete");
          onEngineStatusChange?.("paused");
          playEffect(180, 0.2); // Crash sound
        }
      },
      onRender(interpolation) {
        drawWrenFlight(canvas, stateRef.current, quality, prevStateRef.current, interpolation);
      },
    });
    
    runtimeRef.current = runtime;
    
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "ArrowUp" || event.key === "w") {
        event.preventDefault();
        handleFlap();
      } else if (event.key === "Escape" || event.key === "p" || event.key === "P") {
        event.preventDefault();
        togglePause();
      }
    };
    
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      handleFlap();
    };

    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    const observer = new ResizeObserver(() => drawWrenFlight(canvas, stateRef.current, quality));
    observer.observe(canvas);
    
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [handleFlap, onEngineStatusChange, playEffect, quality, togglePause]);

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
            body: JSON.stringify({ gameSlug: "wren-flight", difficultyKey: "standard" }),
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
      stateRef.current = createWrenFlightState(nextSeed);
      prevStateRef.current = undefined;
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
    stateRef.current = createWrenFlightState(nextSeed);
    prevStateRef.current = undefined;
    
    setScore(0);
    setStatus("ready");
    setCompletion(null);
    onEngineStatusChange?.("ready");
    const canvas = canvasRef.current;
    if (canvas) drawWrenFlight(canvas, stateRef.current, quality);
  }, [onEngineStatusChange, quality]);

  useEffect(() => {
    if (status === "complete" && sessionRef.current && !completion && !submitting) {
      setSubmitting(true);
      const session = sessionRef.current;
      const trace: GameReplayTrace = {
        formatVersion: 1,
        engineVersion: "wren-flight-v1",
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
          sessionRef.current = null;
        });
    }
  }, [status, completion, submitting, quality]);

  return (
    <GameSurface
      canvasRef={canvasRef}
      title="Wren Flight"
      status={status}
      score={String(score)}
      detail="Guide the ribbon-tailed wren safely through the hanging vines. Tap, Click, or press Space to flap."
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
          Target of 15 obstacles not reached. No feathers awarded.
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

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
  getWrenGapSize,
  WREN_REWARD_TARGET,
  type WrenFlightState,
} from "./model";

const WREN_X = 30;
const WREN_RADIUS = 3;
const OBSTACLE_WIDTH = 8;

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
  const night = Math.min(0.72, state.score / 36);
  gradient.addColorStop(0, `hsl(${210 + night * 26}, ${58 - night * 18}%, ${58 - night * 32}%)`);
  gradient.addColorStop(1, `hsl(${132 + night * 18}, ${30 + night * 16}%, ${54 - night * 30}%)`);
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
    const gapHalf = (getWrenGapSize(state.score) / 200) * height;

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

  // Draw the wren with a velocity-led glide and an impulse-driven wingbeat.
  const prevY = prevState?.wrenY ?? state.wrenY;
  const wrenY = prevY + (state.wrenY - prevY) * t;
  
  const x = (WREN_X / 100) * width;
  const y = (wrenY / 100) * height;
  const rX = (WREN_RADIUS / 100) * width;
  const rY = (WREN_RADIUS / 100) * height;

  const flapAge = Math.max(0, state.tickCounter - state.lastFlapTick);
  const flapImpulse = Math.exp(-flapAge / 11);
  const glideTilt = Math.max(-0.28, Math.min(0.38, state.wrenVy * 0.11));
  const wingBeat = Math.sin(state.tickCounter * 0.42) * 0.18 + flapImpulse * 0.78;
  const bob = Math.sin(state.tickCounter * 0.14) * rY * 0.08;

  context.save();
  context.translate(x, y + bob);
  context.rotate(glideTilt);

  // Twin layered wings make every tap feel like a controlled flap, not a jump.
  context.fillStyle = "#9a5538";
  context.beginPath();
  context.moveTo(-rX * 0.15, -rY * 0.05);
  context.quadraticCurveTo(-rX * 1.2, -rY * (1.15 + wingBeat), -rX * 1.7, -rY * (0.2 + wingBeat * 0.35));
  context.quadraticCurveTo(-rX * 0.72, rY * 0.5, rX * 0.15, rY * 0.28);
  context.closePath();
  context.fill();

  context.fillStyle = "#d98955";
  context.beginPath();
  context.ellipse(0, 0, rX, rY * 0.82, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#f6d4a0";
  context.beginPath();
  context.ellipse(rX * 0.28, rY * 0.26, rX * 0.55, rY * 0.36, -0.28, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#6f3729";
  context.beginPath();
  context.moveTo(rX * 0.95, -rY * 0.1);
  context.lineTo(rX * 1.48, rY * 0.12);
  context.lineTo(rX * 0.98, rY * 0.3);
  context.closePath();
  context.fill();
  context.fillStyle = "#1d2d44";
  context.beginPath();
  context.arc(rX * 0.48, -rY * 0.22, Math.max(1.4, rX * 0.13), 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#f4bd65";
  context.lineWidth = Math.max(2, rY * 0.32);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-rX * 0.72, rY * 0.08);
  context.quadraticCurveTo(-rX * 1.75, rY * (0.45 + state.wrenVy * 0.14), -rX * 2.65, rY * (0.25 + Math.sin(state.tickCounter * 0.35) * 0.32));
  context.stroke();
  context.restore();
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
  const [rewardReady, setRewardReady] = useState(false);
  const [didNotQualify, setDidNotQualify] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const { playImpact, playSfx, start: startAudio } = useGameAudio();

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
    const targetRenderFps = quality === "low" ? 30 : 60;

    const runtime = createFixedStepRuntime({
      stepMs,
      targetRenderFps,
      onTick(tick) {
        if (stateRef.current.complete) return;
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
          playSfx("flight-flap");
        }
        
        const prevScore = stateRef.current.score;
        stepWrenFlight(stateRef.current);
        
        if (stateRef.current.score > prevScore) {
          setScore(stateRef.current.score);
          if (stateRef.current.score >= WREN_REWARD_TARGET) setRewardReady(true);
          playSfx("snake-food");
        }

        if (stateRef.current.complete) {
          runtime.pause();
          setDidNotQualify(stateRef.current.score < WREN_REWARD_TARGET);
          setStatus("complete");
          onEngineStatusChange?.("paused");
          playImpact(0.7);
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
  }, [handleFlap, onEngineStatusChange, playImpact, playSfx, quality, togglePause]);

  const start = useCallback(async () => {
    void startAudio();
    
    if (status === "complete" || status === "ready") {
      setCompletion(null);
      setRewardReady(false);
      setDidNotQualify(false);
      setCompletionError(null);
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
    setRewardReady(false);
    setDidNotQualify(false);
    setCompletionError(null);
    onEngineStatusChange?.("ready");
    const canvas = canvasRef.current;
    if (canvas) drawWrenFlight(canvas, stateRef.current, quality);
  }, [onEngineStatusChange, quality]);

  useEffect(() => {
    if (status === "complete" && sessionRef.current && !completion && !submitting) {
      if (stateRef.current.score < WREN_REWARD_TARGET) {
        sessionRef.current = null;
        return;
      }
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
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.data) {
            throw new Error(json?.message ?? "Unable to award Wren Feathers for this session.");
          }
          return json;
        })
        .then((json) => {
          setCompletion(json.data);
          window.dispatchEvent(new CustomEvent("wren-feathers-update", {
            detail: { rewardGranted: json.data.rewardGranted, balanceAfter: json.data.balanceAfter }
          }));
        })
        .catch((error: unknown) => {
          setCompletionError(error instanceof Error ? error.message : "Unable to award Wren Feathers for this session.");
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
      detail={`Reach ${WREN_REWARD_TARGET} vines to earn Wren Feathers. Tap, click, or press Space to give the wren a gentle wingbeat.`}
      onStart={start}
      onPause={pause}
      onRestart={restart}
    >
      {rewardReady && !completion && status !== "complete" && (
        <div className="mt-2 rounded-xl bg-[color-mix(in_srgb,var(--preset-accent)_16%,transparent)] px-4 py-3 text-center text-sm font-medium text-text-primary">
          Reward secured — finish the flight to collect your Wren Feathers.
        </div>
      )}
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
          Today&apos;s Flight reward limit has been reached. Come back tomorrow for more Wren Feathers.
        </div>
      )}
      {didNotQualify && (
        <div className="mt-2 rounded-xl bg-surface/50 p-4 text-center text-sm text-text-secondary">
          Reach {WREN_REWARD_TARGET} vines in one flight to earn Wren Feathers.
        </div>
      )}
      {completionError && (
        <div className="mt-2 rounded-xl bg-rose-500/10 p-4 text-center text-sm text-rose-700 dark:text-rose-300">
          {completionError}
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

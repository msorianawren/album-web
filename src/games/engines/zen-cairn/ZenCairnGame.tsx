"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { GameSurface } from "@/components/games/GameSurface";
import { useGameAudio } from "@/games/core/audio-context.client";
import { createFixedStepRuntime } from "@/games/core/runtime";
import type { GameClientProps, GameInputAction, GameReplayTrace, FinalizeGameSessionResponse } from "@/games/core/types";
import {
  createZenCairnState,
  stepZenCairn,
  dropStone,
  type ZenCairnState,
} from "./model";

const BLOCK_HEIGHT = 8; // 8% of screen height

function drawZenCairn(
  canvas: HTMLCanvasElement, 
  state: ZenCairnState, 
  quality: GameClientProps["quality"],
  prevState?: ZenCairnState,
  interpolation = 1,
  particles?: Array<{x: number, y: number, vx: number, vy: number, life: number, color: string}>
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

  // Background Gradient (Twilight)
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#2b2d42");
  gradient.addColorStop(1, "#8d99ae");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  
  // Stars / Fireflies
  context.fillStyle = "rgba(255, 235, 150, 0.4)";
  for (let i = 0; i < 15; i++) {
    const fireflyX = (width + ((i * 100 + state.tickCounter * (0.2 + i * 0.1)) % (width + 50))) - 25;
    const fireflyY = height * 0.1 + (i * 35) + Math.sin(state.tickCounter * 0.05 + i) * 20;
    context.beginPath();
    context.arc(fireflyX, fireflyY, 1.5, 0, Math.PI * 2);
    context.fill();
  }

  const t = state.complete ? 1 : Math.max(0, Math.min(1, interpolation));

  // Camera Pan
  // We want to keep the top block roughly around 60% of the screen from the top.
  // Base is at 90%. Each block is 8% high.
  // If we have N blocks, the top is at 90 - N * 8.
  // If top < 40, we pan down by (40 - top).
  const towerHeight = state.blocks.length * BLOCK_HEIGHT;
  const topY = 90 - towerHeight;
  let cameraPanY = 0;
  if (topY < 40) {
    cameraPanY = 40 - topY; // Pan down
  }

  // Draw Ground
  context.fillStyle = "#8a817c";
  context.beginPath();
  context.ellipse(width / 2, height * (0.95 + cameraPanY / 100), width * 0.4, height * 0.05, 0, 0, Math.PI * 2);
  context.fill();

  // Draw Placed Blocks
  for (let i = 0; i < state.blocks.length; i++) {
    const block = state.blocks[i];
    const x = (block.x / 100) * width;
    const y = ((90 - (i + 1) * BLOCK_HEIGHT + cameraPanY) / 100) * height;
    const w = (block.width / 100) * width;
    const h = (BLOCK_HEIGHT / 100) * height;

    context.fillStyle = block.color;
    context.beginPath();
    context.roundRect(x - w / 2, y, w, h, Math.min(w * 0.2, h * 0.5));
    context.fill();
    
    // Shine
    context.fillStyle = "rgba(255,255,255,0.15)";
    context.beginPath();
    context.roundRect(x - w / 2 + 2, y + 2, w - 4, h / 3, Math.min(w * 0.1, h * 0.2));
    context.fill();
  }

  // Draw Moving Block
  if (state.movingBlock) {
    const prevBlock = prevState?.movingBlock;
    const mbX = prevBlock ? prevBlock.x + (state.movingBlock.x - prevBlock.x) * t : state.movingBlock.x;
    
    const x = (mbX / 100) * width;
    const y = ((90 - (state.blocks.length + 1) * BLOCK_HEIGHT + cameraPanY) / 100) * height;
    const w = (state.movingBlock.width / 100) * width;
    const h = (BLOCK_HEIGHT / 100) * height;

    // Shadow on the block below
    context.fillStyle = "rgba(0,0,0,0.15)";
    context.beginPath();
    context.ellipse(x, y + h + h * 0.2, w / 2, h * 0.2, 0, 0, Math.PI * 2);
    context.fill();

    // The block itself
    context.fillStyle = state.movingBlock.color;
    context.beginPath();
    context.roundRect(x - w / 2, y, w, h, Math.min(w * 0.2, h * 0.5));
    context.fill();

    // Shine
    context.fillStyle = "rgba(255,255,255,0.15)";
    context.beginPath();
    context.roundRect(x - w / 2 + 2, y + 2, w - 4, h / 3, Math.min(w * 0.1, h * 0.2));
    context.fill();
  }

  // Draw Particles
  if (particles && quality !== "low") {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * (quality === "high" ? 0.5 : 1);
      p.y += p.vy * (quality === "high" ? 0.5 : 1);
      p.vy += 0.2 * (quality === "high" ? 0.5 : 1);
      p.life -= 0.02 * (quality === "high" ? 0.5 : 1);
      if (p.life <= 0) {
        particles.splice(i, 1);
      } else {
        context.fillStyle = `rgba(255, 255, 255, ${p.life})`;
        context.beginPath();
        context.arc((p.x / 100) * width, (p.y / 100) * height, 2, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
}

function generatePracticeSeed() {
  return "practice-" + Math.random().toString(36).slice(2);
}

export default function ZenCairnGame({
  onEngineStatusChange,
  quality = "balanced",
  signedIn,
}: GameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentSeed, setCurrentSeed] = useState("practice-initial");
  const stateRef = useRef(createZenCairnState(currentSeed));
  const prevStateRef = useRef<ZenCairnState | undefined>(undefined);
  const actionRef = useRef<Array<{ type: "drop" }>>([]);
  
  const traceRef = useRef<GameInputAction[]>([]);
  const sessionRef = useRef<{ id: string; nonce: string; seed: string } | null>(null);
  const particlesRef = useRef<Array<{x: number, y: number, vx: number, vy: number, life: number, color: string}>>([]);

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

  const handleDrop = useCallback(() => {
    actionRef.current.push({ type: "drop" });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    drawZenCairn(canvas, stateRef.current, quality, undefined, 1, particlesRef.current);

    const stepMs = 1000 / 60; // Physics ALWAYS runs at 60Hz for deterministic server verification
    const targetRenderFps = quality === "high" ? 120 : quality === "balanced" ? 60 : 30;

    const runtime = createFixedStepRuntime({
      stepMs,
      targetRenderFps,
      onTick(tick) {
        // Deep clone state for interpolation
        prevStateRef.current = {
          ...stateRef.current,
          blocks: stateRef.current.blocks.map(b => ({ ...b })),
          movingBlock: stateRef.current.movingBlock ? { ...stateRef.current.movingBlock } : null,
        };

        let didDrop = false;
        while (actionRef.current.length > 0) {
          actionRef.current.shift();
          didDrop = true;
        }

        if (didDrop) {
          const prevScore = stateRef.current.score;
          dropStone(stateRef.current);
          traceRef.current.push({ tick, type: "drop", payload: null });
          
          if (stateRef.current.score > prevScore) {
            setScore(stateRef.current.score);
            playEffect(660); // Stone clack
            
            // Add Particles
            if (quality !== "low") {
              const topBlock = stateRef.current.blocks[stateRef.current.blocks.length - 1];
              if (topBlock) {
                const towerHeight = stateRef.current.blocks.length * BLOCK_HEIGHT;
                const topY = 90 - towerHeight;
                let cameraPanY = 0;
                if (topY < 40) cameraPanY = 40 - topY;
                const yPos = 90 - stateRef.current.blocks.length * BLOCK_HEIGHT + cameraPanY;
                
                for (let i = 0; i < 15; i++) {
                  particlesRef.current.push({
                    x: topBlock.x + (Math.random() - 0.5) * topBlock.width,
                    y: yPos + BLOCK_HEIGHT,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 1) * 2,
                    life: 1,
                    color: topBlock.color
                  });
                }
              }
            }
          } else if (stateRef.current.complete) {
            playEffect(180, 0.2); // Tumble sound
          }
        }
        
        stepZenCairn(stateRef.current);

        if (stateRef.current.complete) {
          runtime.pause();
          setStatus("complete");
          onEngineStatusChange?.("paused");
        }
      },
      onRender(interpolation) {
        drawZenCairn(canvas, stateRef.current, quality, prevStateRef.current, interpolation, particlesRef.current);
      },
    });
    
    runtimeRef.current = runtime;
    
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter" || event.key === "ArrowDown") {
        event.preventDefault();
        handleDrop();
      } else if (event.key === "Escape" || event.key === "p" || event.key === "P") {
        event.preventDefault();
        togglePause();
      }
    };
    
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      handleDrop();
    };

    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    const observer = new ResizeObserver(() => drawZenCairn(canvas, stateRef.current, quality));
    observer.observe(canvas);
    
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [handleDrop, onEngineStatusChange, playEffect, quality, togglePause]);

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
            body: JSON.stringify({ gameSlug: "zen-cairn", difficultyKey: "standard" }),
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
      stateRef.current = createZenCairnState(nextSeed);
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
    stateRef.current = createZenCairnState(nextSeed);
    prevStateRef.current = undefined;
    
    setScore(0);
    setStatus("ready");
    setCompletion(null);
    onEngineStatusChange?.("ready");
    const canvas = canvasRef.current;
    if (canvas) drawZenCairn(canvas, stateRef.current, quality);
  }, [onEngineStatusChange, quality]);

  useEffect(() => {
    if (status === "complete" && sessionRef.current && !completion && !submitting) {
      setSubmitting(true);
      const session = sessionRef.current;
      const trace: GameReplayTrace = {
        formatVersion: 1,
        engineVersion: "zen-cairn-v1",
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
      title="Zen Cairn"
      status={status}
      score={String(score)}
      detail="Stack smooth river stones perfectly to build a towering cairn. Tap, Click, or press Space to drop a stone."
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
          Target of 12 stones not reached. No feathers awarded.
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

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
  type MergeDirection,
} from "./model";

import { motion } from "framer-motion";

const palette: Record<number, string> = {
  0: "rgba(255,255,255,.1)",
  2: "#e0fbfc",
  4: "#98c1d9",
  8: "#3d5a80",
  16: "#293241",
  32: "#ee6c4d",
  64: "#f4a261",
  128: "#e76f51",
  256: "#f48c06",
  512: "#d00000",
  1024: "#6a040f",
  2048: "#ffba08",
};

function generatePracticeSeed() {
  return "practice-" + Math.random().toString(36).slice(2);
}

export default function FeatherMergeGame({
  onEngineStatusChange,
  quality = "balanced",
  signedIn,
}: GameClientProps) {
  
  const [currentSeed, setCurrentSeed] = useState("practice-initial");
  const [initialState] = useState(() => createFeatherMergeState(currentSeed));
  const stateRef = useRef(initialState);
  const runtimeRef = useRef<ReturnType<typeof createFixedStepRuntime> | null>(null);
  
  const sessionRef = useRef<{ id: string; nonce: string; seed: string } | null>(null);
  const traceRef = useRef<GameInputAction[]>([]);
  const inputRef = useRef<MergeDirection[]>([]);

  const [status, setStatus] = useState<"ready" | "running" | "paused" | "complete">("ready");
  const [score, setScore] = useState(0);
  const [cells, setCells] = useState(initialState.cells);
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

  const queueMove = useCallback((direction: MergeDirection) => {
    if (!runtimeRef.current) return;
    inputRef.current.push(direction);
  }, []);

  useEffect(() => {
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
        setCells([...stateRef.current.cells]);
        dirty = false;
      },
    });
    runtimeRef.current = runtime;
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
      
      if (event.key === "p" || event.key === "Escape") {
        event.preventDefault();
        togglePause();
        return;
      }
      
      if (!direction) return;
      event.preventDefault();
      queueMove(direction);
    };
    
    // We add pointer events to the window or game container instead of canvas
    let startPoint: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      startPoint = { x: event.clientX, y: event.clientY };
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
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onEngineStatusChange, playEffect, quality, queueMove, togglePause]);

  const start = useCallback(async () => {
    void startAudio();

    if (status === "complete" || status === "ready") {
      setCompletion(null);
      setScore(0);
      inputRef.current = [];
      traceRef.current = [];

      let nextSeed = generatePracticeSeed();
      
      if (signedIn) {
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
      }
      
      setCurrentSeed(nextSeed);
      stateRef.current = createFeatherMergeState(nextSeed);
      setCells([...stateRef.current.cells]);
      runtimeRef.current?.reset();
    }
    
    runtimeRef.current?.start();
    setStatus("running");
    onEngineStatusChange?.("running");
  }, [onEngineStatusChange, signedIn, startAudio, status]);


  const restart = useCallback(() => {
    runtimeRef.current?.pause();
    runtimeRef.current?.reset();
    inputRef.current = [];
    traceRef.current = [];
    sessionRef.current = null;

    const nextSeed = generatePracticeSeed();
    setCurrentSeed(nextSeed);
    stateRef.current = createFeatherMergeState(nextSeed);
    setCells([...stateRef.current.cells]);
    
    setScore(0);
    setStatus("ready");
    setCompletion(null);
    onEngineStatusChange?.("ready");
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
      title="Feather Merge"
      status={status}
      score={String(score)}
      detail="Swipe, use arrow keys, WASD, or the controls to merge equal feathers. Reach 2048 without filling the board. Target: 500 score to earn rewards."
      onStart={start}
      onPause={pause}
      onRestart={restart}
    >
      <div className="relative aspect-square w-full max-w-[min(78dvh,42rem)] mx-auto overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#1d2d44] to-[#0d1321] shadow-2xl border border-border">
        <div className="absolute inset-[9%] rounded-[4.5%] bg-[rgba(255,255,255,.05)] shadow-inner">
          {/* Background grid */}
          {Array.from({ length: 16 }).map((_, index) => {
            const x = index % 4;
            const y = Math.floor(index / 4);
            return <div key={index} className="absolute rounded-[14%]" style={{
              left: `${2.5 + x * 24.375}%`,
              top: `${2.5 + y * 24.375}%`,
              width: '21.875%',
              height: '21.875%',
              backgroundColor: 'rgba(255,255,255,0.05)'
            }} />
          })}
          
          {/* Foreground tiles */}
          {cells.map((cell, index) => {
            if (!cell) return null;
            const x = index % 4;
            const y = Math.floor(index / 4);
            return (
              <motion.div
                key={cell.id}
                layout
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: [0.8, 1.15, 1], opacity: 1 }}
                transition={{ 
                  scale: { type: "spring", stiffness: 450, damping: 20 },
                  layout: { type: "spring", stiffness: 350, damping: 28 }
                }}
                className="absolute flex items-center justify-center rounded-[14%] font-serif font-bold pointer-events-none select-none"
                style={{
                  left: `${2.5 + x * 24.375}%`,
                  top: `${2.5 + y * 24.375}%`,
                  width: '21.875%',
                  height: '21.875%',
                  backgroundColor: palette[cell.value] ?? "#1d2436",
                  color: [8, 16, 512, 1024].includes(cell.value) ? "#f8f9fa" : "#1d2d44",
                  fontSize: cell.value >= 1000 ? "1.5rem" : cell.value >= 100 ? "1.8rem" : "2.2rem",
                  zIndex: cell.value,
                  boxShadow: cell.value >= 128 ? `0 0 15px ${palette[cell.value]}80, inset 0 0 10px rgba(255,255,255,0.5)` : "0 4px 6px rgba(0,0,0,0.15)"
                }}
              >
                {cell.value}
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2" aria-label="Feather Merge controls">
        <span />
        <Button variant="icon" aria-label="Move up" onClick={() => queueMove("up")}><ArrowUp className="h-4 w-4" /></Button>
        <span />
        <Button variant="icon" aria-label="Move left" onClick={() => queueMove("left")}><ArrowLeft className="h-4 w-4" /></Button>
        <Button variant="icon" aria-label="Move down" onClick={() => queueMove("down")}><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="icon" aria-label="Move right" onClick={() => queueMove("right")}><ArrowRight className="h-4 w-4" /></Button>
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
          Target of 500 score not reached. No feathers awarded.
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

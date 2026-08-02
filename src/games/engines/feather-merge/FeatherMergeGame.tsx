"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Check,
  Flag,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useGameAudio } from "@/games/core/audio-context.client";
import { createFixedStepRuntime } from "@/games/core/runtime";
import type {
  GameClientProps,
  FinalizeGameSessionResponse,
  GameInputAction,
  GameReplayTrace,
} from "@/games/core/types";
import {
  createFeatherMergeState,
  cloneFeatherMergeState,
  moveFeatherMerge,
  type MergeDirection,
} from "./model";
import { motion } from "framer-motion";

const palette: Record<number, string> = {
  0: "rgba(255,255,255,.08)",
  2: "#e0fbfc",
  4: "#98c1d9",
  8: "#3d5a80",
  16: "#293241",
  25: "#ee6c4d",
  32: "#ee6c4d",
  64: "#f4a261",
  128: "#e76f51",
  256: "#f48c06",
  512: "#d00000",
  1024: "#6a040f",
  2048: "#ffba08",
};

function readBestScore() {
  if (typeof window === "undefined") return 0;
  const stored = Number(window.localStorage.getItem("game:feather-merge:best"));
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}

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
  const [bestScore, setBestScore] = useState(readBestScore);
  const [undosLeft, setUndosLeft] = useState(3);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const historyRef = useRef<Array<{ state: ReturnType<typeof cloneFeatherMergeState>; traceLength: number }>>([]);

  const { playSfx, start: startAudio } = useGameAudio();

  const pause = useCallback(() => {
    setStatus((s) => {
      if (s === "running") {
        runtimeRef.current?.pause();
        onEngineStatusChange?.("paused");
        return "paused";
      }
      return s;
    });
  }, [onEngineStatusChange]);

  const togglePause = useCallback(() => {
    setStatus((s) => {
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

        const beforeMove = cloneFeatherMergeState(stateRef.current);
        const traceLength = traceRef.current.length;
        const scoreBefore = stateRef.current.score;
        if (moveFeatherMerge(stateRef.current, direction)) {
          historyRef.current.push({ state: beforeMove, traceLength });
          if (historyRef.current.length > 3) historyRef.current.shift();
          setUndoAvailable(true);
          traceRef.current.push({ tick, type: "direction", payload: direction });
          setScore(stateRef.current.score);
          setBestScore((currentBest) => {
            const nextBest = Math.max(currentBest, stateRef.current.score);
            if (nextBest !== currentBest) {
              window.localStorage.setItem("game:feather-merge:best", String(nextBest));
            }
            return nextBest;
          });
          playSfx(stateRef.current.score > scoreBefore ? "merge-match" : "merge-move");
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
        W: "up",
        ArrowDown: "down",
        s: "down",
        S: "down",
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right",
      } as Record<string, MergeDirection | undefined>)[event.key];

      if (event.key === "p" || event.key === "P" || event.key === "Escape") {
        event.preventDefault();
        togglePause();
        return;
      }

      if (!direction) return;
      event.preventDefault();
      queueMove(direction);
    };

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
      queueMove(
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up",
      );
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
  }, [onEngineStatusChange, playSfx, quality, queueMove, togglePause]);

  const undo = useCallback(() => {
    if (status !== "running" || undosLeft === 0) return;
    const previous = historyRef.current.pop();
    if (!previous) return;
    stateRef.current = cloneFeatherMergeState(previous.state);
    traceRef.current = traceRef.current.slice(0, previous.traceLength);
    setCells([...stateRef.current.cells]);
    setScore(stateRef.current.score);
    setUndosLeft((left) => left - 1);
    setUndoAvailable(historyRef.current.length > 0);
  }, [status, undosLeft]);

  const start = useCallback(async () => {
    void startAudio();

    if (status === "complete" || status === "ready") {
      setCompletion(null);
      setScore(0);
      inputRef.current = [];
      traceRef.current = [];
      historyRef.current = [];
      setUndosLeft(3);
      setUndoAvailable(false);

      let nextSeed = generatePracticeSeed();

      if (signedIn) {
        try {
          const response = await fetch("/api/game-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameSlug: "feather-merge", difficultyKey: "standard" }),
          });
          if (response.ok) {
            const { data } = await response.json();
            nextSeed = data.seed;
            sessionRef.current = { id: data.sessionId, nonce: data.nonce, seed: data.seed };
          } else {
            sessionRef.current = null;
          }
        } catch {
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
    historyRef.current = [];
    setUndoAvailable(false);
    sessionRef.current = null;

    const nextSeed = generatePracticeSeed();
    setCurrentSeed(nextSeed);
    stateRef.current = createFeatherMergeState(nextSeed);
    setCells([...stateRef.current.cells]);

    setScore(0);
    setUndosLeft(3);
    setStatus("ready");
    setCompletion(null);
    onEngineStatusChange?.("ready");
  }, [onEngineStatusChange]);

  const surrender = useCallback(() => {
    if (status !== "running" && status !== "paused") return;

    // Immediately stop runtime, flag complete state, and trigger session finalize
    runtimeRef.current?.pause();
    stateRef.current.complete = true;
    setStatus("complete");
    onEngineStatusChange?.("paused");
    playSfx("merge-move");
  }, [onEngineStatusChange, playSfx, status]);

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
            window.dispatchEvent(
              new CustomEvent("wren-feathers-update", {
                detail: { rewardGranted: json.data.rewardGranted, balanceAfter: json.data.balanceAfter },
              }),
            );
          }
        })
        .finally(() => {
          setSubmitting(false);
          sessionRef.current = null;
        });
    }
  }, [status, completion, submitting, quality]);

  const highestTile = useMemo(
    () => cells.reduce((highest, cell) => Math.max(highest, cell?.value ?? 0), 0),
    [cells],
  );

  const targetMet = score >= 500;
  const targetProgress = Math.min(100, Math.round((score / 500) * 100));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start w-full max-w-5xl mx-auto">
      {/* Center Stage Game Area */}
      <div className="relative flex flex-col items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--preset-surface)_60%,transparent)] p-4 sm:p-6 md:p-8 backdrop-blur-md shadow-xl overflow-hidden min-h-[540px]">
        {/* Top Badges */}
        <div className="w-full max-w-[420px] mb-3 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface/80 px-3 py-1.5 border border-white/5 flex items-center gap-1.5 shadow-sm">
              <Trophy className="h-3.5 w-3.5 text-accent" />
              Best: {bestScore}
            </span>
            <span className="rounded-full bg-surface/80 px-3 py-1.5 border border-white/5 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Max: {highestTile}
            </span>
          </div>

          <Button
            variant="secondary"
            disabled={status !== "running" || undosLeft === 0 || !undoAvailable}
            onClick={undo}
            className="text-xs h-8 px-2.5"
          >
            <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo ({undosLeft})
          </Button>
        </div>

        {/* 4x4 Grid Board */}
        <div className="relative aspect-square w-full max-w-[400px] sm:max-w-[420px] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#1d2d44] to-[#0d1321] shadow-2xl border border-white/10 select-none touch-none">
          <div className="absolute inset-[8%] rounded-[4.5%] bg-[rgba(255,255,255,.05)] shadow-inner">
            {/* Background grid */}
            {Array.from({ length: 16 }).map((_, index) => {
              const x = index % 4;
              const y = Math.floor(index / 4);
              return (
                <div
                  key={index}
                  className="absolute rounded-[14%]"
                  style={{
                    left: `${2.5 + x * 24.375}%`,
                    top: `${2.5 + y * 24.375}%`,
                    width: "21.875%",
                    height: "21.875%",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                />
              );
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
                    layout: { type: "spring", stiffness: 350, damping: 28 },
                  }}
                  className="absolute flex items-center justify-center rounded-[14%] font-serif font-bold pointer-events-none select-none"
                  style={{
                    left: `${2.5 + x * 24.375}%`,
                    top: `${2.5 + y * 24.375}%`,
                    width: "21.875%",
                    height: "21.875%",
                    background:
                      cell.value === 2048
                        ? "linear-gradient(135deg, #f59e0b, #f43f5e, #8b5cf6, #22d3ee)"
                        : `linear-gradient(135deg, ${palette[cell.value] ?? "#1d2436"}, color-mix(in srgb, ${palette[cell.value] ?? "#1d2436"} 64%, #ffffff))`,
                    color: [8, 16, 512, 1024].includes(cell.value) ? "#f8f9fa" : "#1d2d44",
                    fontSize:
                      cell.value >= 1000 ? "1.4rem" : cell.value >= 100 ? "1.75rem" : "2.15rem",
                    zIndex: cell.value,
                    boxShadow:
                      cell.value >= 128
                        ? `0 0 15px ${palette[cell.value]}80, inset 0 0 10px rgba(255,255,255,0.5)`
                        : "0 4px 6px rgba(0,0,0,0.15)",
                  }}
                >
                  {cell.value}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Arrow Keypad Controls */}
        <div
          className="grid grid-cols-3 gap-1.5 w-36 mt-4 select-none"
          aria-label="Feather Merge controls"
        >
          <span />
          <Button variant="secondary" aria-label="Move up" onClick={() => queueMove("up")} className="h-10 w-10 p-0">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <span />
          <Button variant="secondary" aria-label="Move left" onClick={() => queueMove("left")} className="h-10 w-10 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" aria-label="Move down" onClick={() => queueMove("down")} className="h-10 w-10 p-0">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="secondary" aria-label="Move right" onClick={() => queueMove("right")} className="h-10 w-10 p-0">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* State Overlay Modal (Ready / Paused / Complete) */}
        {status !== "running" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/75 backdrop-blur-[6px] p-6">
            <div className="w-full max-w-sm rounded-2xl border border-[var(--glass-border)] bg-surface/90 p-6 text-center shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                {status === "complete" ? (
                  <Trophy className="h-6 w-6" />
                ) : status === "paused" ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
              </div>

              <h3 className="font-serif text-2xl font-bold text-text-primary">
                {status === "complete"
                  ? "Game Over"
                  : status === "paused"
                    ? "Paused"
                    : "Feather Merge"}
              </h3>

              <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
                {status === "complete"
                  ? `Final score: ${score}. ${targetMet ? "Target of 500 points reached!" : "500-point reward target not reached."}`
                  : status === "paused"
                    ? "Game is paused. Press resume to continue playing."
                    : "Swipe or use Arrow keys / WASD to merge matching feather tiles. Reach 500 points to claim Wren Feathers!"}
              </p>

              {!signedIn && (
                <div className="mt-2 inline-block rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-rose-500/90 border border-rose-500/20">
                  Practice mode
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2">
                <Button onClick={start} className="w-full justify-center">
                  <Play className="h-4 w-4 mr-2" />
                  {status === "ready"
                    ? "Start Game"
                    : status === "complete"
                      ? "Play Again"
                      : "Resume"}
                </Button>

                {status !== "ready" && (
                  <Button variant="secondary" onClick={restart} className="w-full justify-center">
                    <RotateCcw className="h-4 w-4 mr-2" /> Restart
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar Control & Rewards Panel */}
      <aside className="flex flex-col gap-4 w-full">
        {/* Score & Rewards Goal Card */}
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--preset-surface)_60%,transparent)] p-5 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Current Score
            </span>
            {targetMet && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                <Check className="h-3 w-3" /> Goal Reached
              </span>
            )}
          </div>
          <div className="mt-1 font-serif text-3xl font-bold tracking-tight text-text-primary">
            {score}
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-xs text-text-secondary mb-1">
              <span>Reward Goal</span>
              <span className="font-medium">{targetProgress}% (500 pts)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface/70 border border-white/5">
              <div
                className={`h-full transition-all duration-300 ${
                  targetMet
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : "bg-gradient-to-r from-accent to-amber-400"
                }`}
                style={{ width: `${targetProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--preset-surface)_60%,transparent)] p-5 backdrop-blur-md shadow-md flex flex-col gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Game Controls
          </span>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              disabled={status !== "running" && status !== "paused"}
              onClick={togglePause}
              className="justify-center"
            >
              {status === "paused" ? (
                <>
                  <Play className="h-4 w-4 mr-1.5 text-accent" /> Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1.5" /> Pause
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={restart} className="justify-center">
              <RotateCcw className="h-4 w-4 mr-1.5" /> Restart
            </Button>
          </div>

          {/* Surrender & Claim Reward Button */}
          <div className="mt-1.5 pt-3 border-t border-border/40 flex flex-col gap-1.5">
            <Button
              variant={targetMet ? "primary" : "secondary"}
              disabled={status !== "running" && status !== "paused"}
              onClick={surrender}
              className={`w-full justify-center font-medium shadow-sm transition-all ${
                targetMet && (status === "running" || status === "paused")
                  ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white border-none hover:opacity-95 ring-2 ring-amber-400/30"
                  : ""
              }`}
            >
              <Flag className="h-4 w-4 mr-2" />
              Surrender & Claim Reward
            </Button>
            <p className="text-[11px] text-text-secondary leading-tight px-1 text-center">
              {targetMet
                ? `Reached ${score} points! Surrender now to lock in your score and claim Wren Feathers.`
                : `End session early with ${score} points (requires ≥ 500 points to claim Wren Feathers).`}
            </p>
          </div>
        </div>

        {/* Completion & Rewards Feedback */}
        {completion && completion.rewardGranted > 0 && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center backdrop-blur-md">
            <Award className="mx-auto mb-1.5 h-6 w-6 text-emerald-400 animate-bounce" />
            <p className="font-serif text-lg font-bold text-text-primary">
              +{completion.rewardGranted} Wren Feathers
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Reward claimed successfully with {score} points!
            </p>
            {completion.duplicate && (
              <p className="mt-1 text-[11px] text-text-secondary">Daily reward already claimed today.</p>
            )}
          </div>
        )}

        {completion && completion.rewardGranted === 0 && (
          <div className="rounded-2xl border border-border/40 bg-surface/40 p-4 text-center text-xs text-text-secondary">
            Did not reach the 500-point threshold ({score} points). No Wren Feathers awarded.
          </div>
        )}

        {!completion && status === "complete" && !signedIn && (
          <div className="rounded-2xl border border-border/40 bg-surface/40 p-4 text-center text-xs text-text-secondary">
            Practice session complete with {score} points.
          </div>
        )}

        {/* How to play card */}
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--preset-surface)_40%,transparent)] p-4 text-xs text-text-secondary backdrop-blur-md">
          <div className="flex items-center gap-1.5 font-semibold text-text-primary mb-2">
            <HelpCircle className="h-4 w-4 text-accent" /> How to Play
          </div>
          <ul className="space-y-1 text-[11px] leading-relaxed list-disc list-inside">
            <li>Use <kbd className="px-1 py-0.5 bg-surface rounded border border-border/40 font-mono text-[10px]">W</kbd><kbd className="px-1 py-0.5 bg-surface rounded border border-border/40 font-mono text-[10px]">A</kbd><kbd className="px-1 py-0.5 bg-surface rounded border border-border/40 font-mono text-[10px]">S</kbd><kbd className="px-1 py-0.5 bg-surface rounded border border-border/40 font-mono text-[10px]">D</kbd>, Arrow keys, or swipe.</li>
            <li>Tiles with identical values slide into each other and merge into one.</li>
            <li>Press <kbd className="px-1 py-0.5 bg-surface rounded border border-border/40 font-mono text-[10px]">P</kbd> or <kbd className="px-1 py-0.5 bg-surface rounded border border-border/40 font-mono text-[10px]">Esc</kbd> to pause.</li>
            <li>You have 3 <strong>Undo</strong> moves available to revert previous turns.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

"use client";

import { Check, Flag, MousePointer2, Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { useGameAudio } from "@/games/core/audio-context.client";
import type { GameClientProps, FinalizeGameSessionResponse, GameInputAction, GameReplayTrace } from "@/games/core/types";
import { createFixedStepRuntime } from "@/games/core/runtime";
import { createQuietMeadowState, revealCell, toggleFlag } from "./model";
import type { QuietMeadowState, QuietMeadowDifficulty } from "./types";
import { quietMeadowDifficulties } from "./config";
import { createGuestScoreStorage } from "@/games/core/storage";

function generatePracticeSeed() {
  return "practice-" + Math.random().toString(36).slice(2);
}

const scores = createGuestScoreStorage(typeof window !== "undefined" ? window.localStorage : { getItem: () => null, setItem: () => {} });

export default function QuietMeadowGame({
  onEngineStatusChange,
  quality = "balanced",
  signedIn,
}: GameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; phase: number }>>([]);
  
  const [difficulty, setDifficulty] = useState<QuietMeadowDifficulty>("meadow");
  const [currentSeed, setCurrentSeed] = useState(generatePracticeSeed());
  const [state, setState] = useState<QuietMeadowState>(() => createQuietMeadowState(quietMeadowDifficulties["meadow"], currentSeed));
  
  const stateRef = useRef(state);
  const sessionRef = useRef<{ id: string; nonce: string; seed: string } | null>(null);
  const traceRef = useRef<GameInputAction[]>([]);
  const actionCounterRef = useRef(0);
  
  const [status, setStatus] = useState<"ready" | "running" | "paused" | "complete">("ready");
  const [completion, setCompletion] = useState<FinalizeGameSessionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  
  const { playEffect, start: startAudio } = useGameAudio();

  const updateState = useCallback(() => {
    setState({ ...stateRef.current });
    if (stateRef.current.status === "won" || stateRef.current.status === "lost") {
      setStatus("complete");
      onEngineStatusChange?.("paused");
      if (stateRef.current.status === "won") playEffect(660);
      else playEffect(180, 0.2);
    }
  }, [onEngineStatusChange, playEffect]);

  const handleReveal = useCallback((x: number, y: number) => {
    if (status !== "running" || stateRef.current.status === "won" || stateRef.current.status === "lost") return;
    const changed = revealCell(stateRef.current, x, y);
    if (changed) {
      traceRef.current.push({ tick: actionCounterRef.current++, type: "reveal", payload: { x, y } });
      updateState();
    }
  }, [status, updateState]);

  const handleFlag = useCallback((x: number, y: number) => {
    if (status !== "running" || stateRef.current.status === "won" || stateRef.current.status === "lost") return;
    const changed = toggleFlag(stateRef.current, x, y);
    if (changed) {
      traceRef.current.push({ tick: actionCounterRef.current++, type: stateRef.current.cells[y * stateRef.current.width + x].isFlagged ? "flag" : "unflag", payload: { x, y } });
      updateState();
    }
  }, [status, updateState]);

  const handleCellAction = useCallback((x: number, y: number) => {
    if (flagMode) handleFlag(x, y);
    else handleReveal(x, y);
  }, [flagMode, handleFlag, handleReveal]);

  const handleContextMenu = useCallback((e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    handleFlag(x, y);
  }, [handleFlag]);

  const start = useCallback(async () => {
    void startAudio();
    if (status === "complete" || status === "ready") {
      setCompletion(null);
      traceRef.current = [];
      actionCounterRef.current = 0;

      let nextSeed = generatePracticeSeed();
      
      if (signedIn) {
        try {
          const response = await fetch("/api/game-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameSlug: "quiet-meadow" }),
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
      stateRef.current = createQuietMeadowState(quietMeadowDifficulties[difficulty], nextSeed);
      setState(stateRef.current);
    }
    
    setStatus("running");
    onEngineStatusChange?.("running");
  }, [difficulty, onEngineStatusChange, signedIn, startAudio, status]);

  const pause = useCallback(() => {
    if (status === "running") {
      setStatus("paused");
      onEngineStatusChange?.("paused");
    }
  }, [onEngineStatusChange, status]);

  const restart = useCallback(() => {
    traceRef.current = [];
    actionCounterRef.current = 0;
    sessionRef.current = null;

    const nextSeed = generatePracticeSeed();
    setCurrentSeed(nextSeed);
    stateRef.current = createQuietMeadowState(quietMeadowDifficulties[difficulty], nextSeed);
    setState(stateRef.current);
    
    setStatus("ready");
    setCompletion(null);
    onEngineStatusChange?.("ready");
  }, [difficulty, onEngineStatusChange]);

  useEffect(() => {
    if (status === "complete" && sessionRef.current && !completion && !submitting) {
      setSubmitting(true);
      const session = sessionRef.current;
      const trace: GameReplayTrace = {
        formatVersion: 1,
        engineVersion: "quiet-meadow-v1",
        seed: session.seed,
        fixedStepMs: 0,
        actions: traceRef.current,
      };
      
      fetch(`/api/game-sessions/${session.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nonce: session.nonce, replay: trace }),
      })
        .then((res) => {
          if (!res.ok) {
            res.text().then(text => console.error("Complete API Error:", res.status, text));
          }
          return res.ok ? res.json() : null;
        })
        .then((json) => {
          if (json?.data) {
            setCompletion(json.data);
            window.dispatchEvent(new CustomEvent("wren-feathers-update", {
              detail: { rewardGranted: json.data.rewardGranted, balanceAfter: json.data.balanceAfter }
            }));
          } else {
             console.error("Complete API Error: no data in JSON", json);
          }
        })
        .catch((e) => {
          console.error("Complete API Catch Error:", e);
        })
        .finally(() => {
          setSubmitting(false);
          sessionRef.current = null;
        });
    }
  }, [status, completion, submitting]);

  useEffect(() => {
    if (state.status === "won") {
      scores.save("quiet-meadow-v1-" + difficulty, {
        score: state.revealedCount,
        durationTicks: state.elapsedActions,
        updatedAt: new Date().toISOString()
      });
    }
  }, [state.status, state.revealedCount, state.elapsedActions, difficulty]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (status !== "running") return;
      if (e.key === "f" || e.key === "F") {
        setFlagMode(m => !m);
      }
      if (e.key === "Escape") {
        pause();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, pause]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Initialize fog
    if (fogRef.current.length === 0) {
      for (let i = 0; i < (quality === "high" ? 40 : 20); i++) {
        fogRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 80 + 40,
          alpha: Math.random() * 0.15 + 0.05,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    const runtime = createFixedStepRuntime({
      stepMs: 1000 / 60,
      targetRenderFps: quality === "high" ? 120 : quality === "balanced" ? 60 : 30,
      onTick(tick) {
        const speed = quality === "high" ? 0.5 : 1;
        fogRef.current.forEach(p => {
          p.x += p.vx * speed;
          p.y += p.vy * speed;
          p.phase += 0.01 * speed;
          
          if (p.x < -p.size) p.x = canvas.width + p.size;
          if (p.x > canvas.width + p.size) p.x = -p.size;
          if (p.y < -p.size) p.y = canvas.height + p.size;
          if (p.y > canvas.height + p.size) p.y = -p.size;
        });
      },
      onRender() {
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        fogRef.current.forEach(p => {
          const currentAlpha = p.alpha + Math.sin(p.phase) * 0.05;
          if (currentAlpha <= 0) return;
          
          ctx.beginPath();
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, `rgba(255, 255, 255, ${currentAlpha})`);
          grad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
    
    runtime.start();
    return () => runtime.destroy();
  }, [quality]);

  const boardStyle = useMemo(() => ({
    display: "grid",
    gridTemplateColumns: `repeat(${state.width}, minmax(0, 1fr))`,
    gap: "2px",
    width: "100%",
    maxWidth: state.width * 36 + "px",
    margin: "0 auto",
  }), [state.width]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div 
        className="relative overflow-hidden rounded-[1.5rem] border border-[var(--glass-border)] bg-gradient-to-br from-[#f7f9f6] to-[#eaf2e8] shadow-2xl p-6"
        data-game-board-hash={state.seed}
        data-game-revealed={state.revealedCount}
        data-game-flags={state.flagCount}
        data-game-result={state.status === "ready" ? "playing" : state.status}
      >
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 w-full h-full opacity-60 mix-blend-screen" />
        
        {status !== "running" && (
          <div className="absolute z-10 inset-0 flex items-center justify-center bg-background/45 p-5 backdrop-blur-[3px]">
            <div className="max-w-sm text-center">
              <p className="font-serif text-3xl text-[#3a4f41]">
                {status === "complete" ? (state.status === "won" ? "Meadow Cleared" : "Mine Triggered") : status === "paused" ? "Paused" : "Quiet Meadow"}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {status === "complete" ? "Session complete" : "Carefully uncover the hidden blooms and dew across the peaceful meadow."}
              </p>
              {!signedIn && (
                <p className="mt-2 text-xs font-semibold text-rose-600/80 uppercase tracking-widest">
                  Practice mode
                </p>
              )}
              <div className="mt-5 flex justify-center gap-3">
                <Button onClick={start}>
                  <Play className="h-4 w-4" />
                  {status === "ready" ? "Start" : status === "complete" ? "Play again" : "Resume"}
                </Button>
                {status === "complete" && <Button variant="secondary" onClick={restart}><RotateCcw className="h-4 w-4" /> Restart</Button>}
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between text-sm font-medium text-[#4a6352]">
          <div className="flex gap-4">
            <span>Flags: {state.totalMines - state.flagCount}</span>
            <span>Revealed: {state.revealedCount} / {state.width * state.height - state.totalMines}</span>
          </div>
          {status === "ready" && (
            <select 
              value={difficulty} 
              onChange={e => setDifficulty(e.target.value as QuietMeadowDifficulty)}
              className="bg-transparent outline-none border-b border-[#a3b8aa]"
            >
              <option value="meadow">Meadow (9x9)</option>
              <option value="garden">Garden (12x12)</option>
              <option value="wildfield">Wildfield (16x16)</option>
            </select>
          )}
        </div>

        <div style={boardStyle} aria-label="Minesweeper board" role="grid" className="relative z-10 touch-none select-none">
          {state.cells.map((cell, i) => {
            const x = i % state.width;
            const y = Math.floor(i / state.width);
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                onClick={() => handleCellAction(x, y)}
                onContextMenu={(e) => handleContextMenu(e, x, y)}
                disabled={status !== "running" && status !== "complete"}
                aria-label={cell.isRevealed ? (cell.isMine ? "Exploded mine" : cell.adjacentMines > 0 ? `Revealed ${cell.adjacentMines}` : "Revealed empty") : cell.isFlagged ? "Flagged" : "Hidden"}
                className={`aspect-square w-full rounded flex items-center justify-center text-sm font-bold transition-all duration-300
                  ${cell.isRevealed 
                    ? (cell.isMine ? "bg-red-200 text-red-700 shadow-inner scale-95" : "bg-[#e2e8df] text-[#3a4f41] shadow-inner scale-100") 
                    : "bg-gradient-to-b from-[#b8c9bc] to-[#a3b8aa] hover:from-[#a3b8aa] hover:to-[#8c9e93] cursor-pointer shadow-md hover:shadow-sm scale-100"}
                `}
              >
                {cell.isRevealed && !cell.isMine && cell.adjacentMines > 0 && cell.adjacentMines}
                {cell.isRevealed && cell.isMine && "💥"}
                {!cell.isRevealed && cell.isFlagged && <Flag className="h-4 w-4 text-[#d97757] fill-current" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--preset-surface)_50%,transparent)] p-5">
          <h3 className="font-serif text-lg text-text-primary">Controls</h3>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li className="flex items-center gap-2"><MousePointer2 className="h-4 w-4" /> Left Click / Tap = Reveal</li>
            <li className="flex items-center gap-2"><Flag className="h-4 w-4" /> Right Click = Flag</li>
            <li className="flex items-center gap-2">Keyboard <strong>F</strong> = Toggle Flag Mode</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-border">
            <Button 
              variant={flagMode ? "primary" : "secondary"} 
              className="w-full justify-center"
              onClick={() => setFlagMode(!flagMode)}
            >
              <Flag className="h-4 w-4" />
              {flagMode ? "Flag Mode: ON" : "Flag Mode: OFF"}
            </Button>
          </div>
        </div>

        {completion && (
          <div className="rounded-xl bg-[color-mix(in_srgb,var(--preset-accent)_20%,transparent)] p-4 text-center">
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
          <div className="rounded-xl bg-surface/50 p-4 text-center text-sm text-text-secondary">
            Practice session complete.
          </div>
        )}
      </div>
    </div>
  );
}

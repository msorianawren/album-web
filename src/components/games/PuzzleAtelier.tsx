"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, Eye, Play, RotateCcw, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { createPuzzleBoard, isSolved, legalSlidingPositions, moveSlidingTile, swapTiles } from "@/lib/puzzles/engine";
import { estimatePuzzleReward } from "@/lib/puzzles/rewards";
import type { PuzzleChallenge, PuzzleGridSize, PuzzleMode, PuzzleResult, PuzzleTile, SlidingMove, SwapMove } from "@/lib/puzzles/types";

const storageVersion = "oriana.puzzle.best.v1";
const grids: PuzzleGridSize[] = [3, 4, 5];
const modes: PuzzleMode[] = ["sliding", "swap"];

type GameCopy = Record<string, string | undefined>;
type Completion = { rewardEarned: number; totalFeathers: number; completionCount: number; moveCount: number; badges: string[] } | null;

function resultKey(challengeId: string, mode: PuzzleMode, grid: PuzzleGridSize) {
  return `${challengeId}:${mode}:${grid}`;
}

function readGuestResults() {
  try {
    const value = JSON.parse(localStorage.getItem(storageVersion) ?? "{}") as Record<string, PuzzleResult>;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeGuestResult(key: string, time: number, moves: number) {
  const values = readGuestResults();
  const current = values[key];
  values[key] = {
    bestTimeMs: current?.bestTimeMs === null || current?.bestTimeMs === undefined ? time : Math.min(current.bestTimeMs, time),
    bestMoveCount: current?.bestMoveCount === null || current?.bestMoveCount === undefined ? moves : Math.min(current.bestMoveCount, moves),
    bestReward: 0,
    completionCount: (current?.completionCount ?? 0) + 1,
  };
  try { localStorage.setItem(storageVersion, JSON.stringify(values)); } catch { /* local bests are optional */ }
  return values[key];
}

function formatDuration(milliseconds: number) {
  const total = Math.floor(milliseconds / 1000);
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function currentTimestamp() {
  return Date.now();
}

function tilePosition(tile: number, grid: PuzzleGridSize) {
  const index = tile - 1;
  return `${(index % grid) * (100 / (grid - 1))}% ${Math.floor(index / grid) * (100 / (grid - 1))}%`;
}

function PuzzleBoard({
  board,
  imageUrl,
  grid,
  mode,
  selected,
  highlighted,
  onTile,
}: {
  board: PuzzleTile[];
  imageUrl: string | null;
  grid: PuzzleGridSize;
  mode: PuzzleMode;
  selected: number | null;
  highlighted: boolean;
  onTile: (position: number) => void;
}) {
  const legal = mode === "sliding" ? new Set(legalSlidingPositions(board, grid)) : new Set<number>();
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (mode !== "sliding") return;
    const empty = board.indexOf(null);
    const direction = event.key === "ArrowUp" ? grid : event.key === "ArrowDown" ? -grid : event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0;
    if (!direction) return;
    const position = empty + direction;
    if (legal.has(position)) {
      event.preventDefault();
      onTile(position);
    }
  };

  return (
    <div
      className="grid aspect-square w-full max-w-[min(78dvh,42rem)] touch-manipulation overflow-hidden rounded-[1.5rem] border border-border bg-surface-secondary p-1.5 shadow-2xl shadow-text-primary/10 sm:p-2"
      style={{ gridTemplateColumns: `repeat(${grid}, minmax(0, 1fr))` }}
      onKeyDown={onKeyDown}
      aria-label={`${grid} by ${grid} ${mode} puzzle board`}
    >
      {board.map((tile, position) => tile === null ? (
        <div key={`empty-${position}`} className="m-0.5 rounded-[0.65rem] border border-dashed border-border/70 bg-background/35" aria-label="Empty position" />
      ) : (
        <button
          key={tile}
          type="button"
          onClick={() => onTile(position)}
          aria-label={`Tile ${tile}, current position ${position + 1}, correct position ${tile}${mode === "sliding" && legal.has(position) ? ", movable" : ""}`}
          aria-pressed={mode === "swap" ? selected === position : undefined}
          className={`group relative m-0.5 min-h-11 overflow-hidden rounded-[0.65rem] border bg-surface transition duration-200 motion-reduce:transition-none focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            selected === position ? "border-accent ring-2 ring-accent/60" : highlighted && (mode === "swap" || legal.has(position)) ? "border-accent/80 ring-1 ring-accent/50" : "border-border/60"
          } ${mode === "sliding" && legal.has(position) ? "cursor-pointer" : mode === "sliding" ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
          disabled={mode === "sliding" && !legal.has(position)}
        >
          {imageUrl ? <span className="absolute inset-0 bg-cover bg-no-repeat" style={{ backgroundImage: `url("${imageUrl}")`, backgroundSize: `${grid * 100}% ${grid * 100}%`, backgroundPosition: tilePosition(tile, grid) }} /> : <span className="absolute inset-0 bg-surface-secondary" />}
          <span className="absolute inset-x-1 bottom-1 rounded bg-black/45 px-1 py-0.5 text-center text-[0.58rem] font-semibold text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100">{tile}</span>
          <span className="sr-only">Tile {tile}</span>
        </button>
      ))}
    </div>
  );
}

export function PuzzleAtelier({ initialChallenges, initialResults, signedIn, copy = {}, unavailable = false }: {
  initialChallenges: PuzzleChallenge[];
  initialResults: Record<string, PuzzleResult>;
  signedIn: boolean;
  copy?: GameCopy;
  unavailable?: boolean;
}) {
  const { toast } = useToast();
  const [challengeId, setChallengeId] = useState(initialChallenges[0]?.id ?? "");
  const [mode, setMode] = useState<PuzzleMode>("sliding");
  const [grid, setGrid] = useState<PuzzleGridSize>(3);
  const [board, setBoard] = useState<PuzzleTile[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [trace, setTrace] = useState<Array<SlidingMove | SwapMove>>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [results, setResults] = useState(initialResults);
  const [completion, setCompletion] = useState<Completion>(null);
  const [showReference, setShowReference] = useState(false);
  const [showValidMoves, setShowValidMoves] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const startedRef = useRef<number | null>(null);

  const challenge = initialChallenges.find((item) => item.id === challengeId) ?? null;
  const selectableModes = challenge?.allowedModes ?? modes;
  const selectableGrids = challenge?.allowedGridSizes ?? grids;
  const activeMode = challenge?.allowedModes.includes(mode) ? mode : (challenge?.allowedModes[0] ?? mode);
  const activeGrid = challenge?.allowedGridSizes.includes(grid) ? grid : (challenge?.allowedGridSizes[0] ?? grid);
  const currentKey = challenge ? resultKey(challenge.id, activeMode, activeGrid) : "";
  const currentResult = results[currentKey];
  const estimatedReward = challenge ? estimatePuzzleReward(activeGrid, activeMode, challenge.rewardMultiplier) : 0;

  const newGame = useCallback(async (nextChallenge: PuzzleChallenge, nextMode: PuzzleMode, nextGrid: PuzzleGridSize) => {
    if (!nextChallenge) return;
    const nextSeed = `${nextChallenge.id}:${nextChallenge.baseSeed}:${nextMode}:${nextGrid}`;
    setBoard(createPuzzleBoard(nextSeed, nextMode, nextGrid));
    setSelected(null);
    setTrace([]);
    setMoves(0);
    setElapsed(0);
    setStartedAt(null);
    startedRef.current = null;
    setAttemptId(null);
    setCompletion(null);
    if (signedIn) {
      try {
        const response = await fetch("/api/games/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: nextChallenge.id, mode: nextMode, gridSize: nextGrid }) });
        const payload = await response.json();
        if (response.ok && payload.success) setAttemptId(payload.data.attempt.attemptId);
        else toast.info(copy.offline ?? "Playing offline. Sign in again to claim Feathers.");
      } catch {
        toast.info(copy.offline ?? "Playing offline. Sign in again to claim Feathers.");
      }
    }
  }, [copy.offline, signedIn, toast]);

  useEffect(() => {
    if (!challenge) return;
    const start = window.setTimeout(() => void newGame(challenge, activeMode, activeGrid), 0);
    return () => window.clearTimeout(start);
  }, [activeGrid, activeMode, challenge, newGame]);

  useEffect(() => {
    if (!startedAt || completion) return;
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => window.clearInterval(timer);
  }, [completion, startedAt]);

  useEffect(() => {
    const listener = (event: Event) => {
      const action = (event as CustomEvent<{ action?: string }>).detail?.action;
      if (action === "valid-moves") {
        setShowValidMoves(true);
        window.setTimeout(() => setShowValidMoves(false), 3000);
      }
      if (action === "reference") setShowReference(true);
      if (action === "restart" && challenge) void newGame(challenge, activeMode, activeGrid);
    };
    document.addEventListener("oriana-games-assist", listener);
    return () => document.removeEventListener("oriana-games-assist", listener);
  }, [activeGrid, activeMode, challenge, newGame]);

  async function finish(nextTrace: Array<SlidingMove | SwapMove>, nextMoves: number) {
    const finalElapsed = startedRef.current ? currentTimestamp() - startedRef.current : 0;
    setElapsed(finalElapsed);
    setStartedAt(null);
    if (!challengeId) return;
    const resultId = resultKey(challengeId, activeMode, activeGrid);
    if (!signedIn || !attemptId) {
      const result = writeGuestResult(resultId, finalElapsed, nextMoves);
      setResults((current) => ({ ...current, [resultId]: result }));
      setCompletion({ rewardEarned: 0, totalFeathers: 0, completionCount: result.completionCount, moveCount: nextMoves, badges: [] });
      return;
    }
    setIsFinalizing(true);
    try {
      const response = await fetch(`/api/games/attempts/${attemptId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId, elapsedMs: finalElapsed, trace: nextTrace }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message ?? "Could not verify this puzzle.");
      const value = payload.data.completion as Completion;
      setCompletion(value);
      setResults((current) => ({ ...current, [resultId]: { bestTimeMs: finalElapsed, bestMoveCount: nextMoves, bestReward: value?.rewardEarned ?? 0, completionCount: value?.completionCount ?? 1 } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify this puzzle.");
    } finally {
      setIsFinalizing(false);
    }
  }

  function makeMove(position: number) {
    if (!challengeId || completion || isFinalizing) return;
    let nextBoard: PuzzleTile[] | null = null;
    let nextTrace: Array<SlidingMove | SwapMove> = trace;
    if (activeMode === "sliding") {
      const tile = board[position];
      if (tile === null) return;
      nextBoard = moveSlidingTile(board, activeGrid, tile);
      if (!nextBoard) return;
      nextTrace = [...trace, { tile }];
    } else if (selected === null) {
      setSelected(position);
      return;
    } else {
      nextBoard = swapTiles(board, selected, position);
      if (!nextBoard) return;
      nextTrace = [...trace, { from: selected, to: position }];
      setSelected(null);
    }
    if (!startedRef.current) {
      const now = currentTimestamp();
      startedRef.current = now;
      setStartedAt(now);
    }
    const nextMoves = moves + 1;
    setBoard(nextBoard);
    setTrace(nextTrace);
    setMoves(nextMoves);
    if (isSolved(nextBoard)) void finish(nextTrace, nextMoves);
  }

  const collections = useMemo(() => [...new Set(initialChallenges.map((item) => item.collection))], [initialChallenges]);
  const [collection, setCollection] = useState<string>("all");
  const visibleChallenges = initialChallenges.filter((item) => collection === "all" || item.collection === collection);

  if (unavailable) {
    return <section className="mx-auto max-w-3xl px-6 py-24 text-center"><p className="text-sm uppercase tracking-[0.18em] text-text-secondary">{copy.unavailable ?? "Puzzle Atelier is being prepared. Please return shortly."}</p></section>;
  }

  if (!initialChallenges.length) {
    return <section className="mx-auto max-w-3xl px-6 py-24 text-center"><p className="text-sm uppercase tracking-[0.18em] text-text-secondary">{copy.empty ?? "No published puzzle challenges yet."}</p></section>;
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
      <header className="max-w-3xl">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-secondary">{copy.eyebrow ?? "Interactive editorial studies"}</p>
        <h1 className="mt-4 font-serif text-5xl font-light leading-none text-text-primary sm:text-7xl">{copy.title ?? "Oriana Puzzle Atelier"}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary">{copy.description ?? "A quiet collection of image puzzles. Play as a guest, or sign in to collect Wren Feathers and badges."}</p>
      </header>

      <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.55fr)]">
        <div className="order-2 xl:order-1">
          <PuzzleBoard board={board} imageUrl={challenge?.imageUrl ?? null} grid={activeGrid} mode={activeMode} selected={selected} highlighted={showValidMoves} onTile={makeMove} />
          <p className="sr-only" aria-live="polite">{completion ? "Puzzle completed." : ""}</p>
        </div>

        <aside className="order-1 grid content-start gap-4 xl:order-2">
          <div className="rounded-[1.4rem] border border-border bg-surface/80 p-4 shadow-lg shadow-text-primary/5">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{copy.collection ?? "Collection"}</label>
            <select value={collection} onChange={(event) => { setCollection(event.target.value); const next = initialChallenges.find((item) => event.target.value === "all" || item.collection === event.target.value); if (next) setChallengeId(next.id); }} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">{copy.allCollections ?? "All collections"}</option>
              {collections.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
            <div className="mt-4 grid gap-2">
              {visibleChallenges.map((item) => <button key={item.id} type="button" onClick={() => setChallengeId(item.id)} className={`flex min-h-16 items-center gap-3 rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${item.id === challengeId ? "border-accent bg-background" : "border-border bg-surface-secondary/40 hover:bg-background"}`}>
                {item.previewUrl ? <span className="h-12 w-12 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url("${item.previewUrl}")` }} /> : <span className="h-12 w-12 shrink-0 rounded-lg bg-surface-secondary" />}
                <span className="min-w-0"><span className="block truncate font-serif text-lg text-text-primary">{item.title}</span><span className="block truncate text-xs text-text-secondary">{item.description}</span></span>
              </button>)}
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-border bg-surface/80 p-4 shadow-lg shadow-text-primary/5">
            <div className="grid gap-4">
              <div><p className="font-serif text-2xl text-text-primary">{challenge?.title}</p><p className="mt-1 text-sm text-text-secondary">{challenge?.description}</p></div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Puzzle mode">
                {selectableModes.map((item) => <Button key={item} variant={activeMode === item ? "primary" : "secondary"} onClick={() => setMode(item)}>{item === "sliding" ? (copy.sliding ?? "Sliding") : (copy.swap ?? "Swap")}</Button>)}
              </div>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Puzzle difficulty">
                {selectableGrids.map((item) => <Button key={item} variant={activeGrid === item ? "primary" : "secondary"} onClick={() => setGrid(item)}>{item} x {item}</Button>)}
              </div>
              <dl className="grid grid-cols-2 gap-3 rounded-xl bg-background/60 p-3 text-sm">
                <div><dt className="text-xs uppercase tracking-[0.12em] text-text-secondary">{copy.timer ?? "Timer"}</dt><dd className="mt-1 font-semibold text-text-primary">{formatDuration(elapsed)}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.12em] text-text-secondary">{activeMode === "sliding" ? (copy.moves ?? "Moves") : (copy.swaps ?? "Swaps")}</dt><dd className="mt-1 font-semibold text-text-primary">{moves}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.12em] text-text-secondary">{copy.estimatedReward ?? "Estimated reward"}</dt><dd className="mt-1 font-semibold text-text-primary">{estimatedReward} {copy.feathers ?? "Feathers"}</dd></div>
                <div><dt className="text-xs uppercase tracking-[0.12em] text-text-secondary">{copy.personalBest ?? "Personal best"}</dt><dd className="mt-1 font-semibold text-text-primary">{currentResult?.bestTimeMs ? `${formatDuration(currentResult.bestTimeMs)} / ${currentResult.bestMoveCount}` : "-"}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => challenge && void newGame(challenge, activeMode, activeGrid)}><Sparkles className="h-4 w-4" />{copy.newGame ?? "New game"}</Button>
                <Button variant="secondary" onClick={() => challenge && void newGame(challenge, activeMode, activeGrid)}><RotateCcw className="h-4 w-4" />{copy.restart ?? "Restart"}</Button>
                <Button variant="secondary" onClick={() => setShowReference(true)}><Eye className="h-4 w-4" />{copy.viewReference ?? "View reference"}</Button>
                <Button variant="ghost" onClick={() => { setCollection("all"); setChallengeId(initialChallenges[0].id); }}><ChevronLeft className="h-4 w-4" />{copy.back ?? "Back to collections"}</Button>
              </div>
              {!signedIn && <p className="text-xs leading-5 text-text-secondary">{copy.guestNotice ?? "Guests can play and save local bests. Sign in to claim Wren Feathers."}</p>}
            </div>
          </div>
        </aside>
      </div>

      <Modal open={showReference} onClose={() => setShowReference(false)} title={copy.referenceTitle ?? "Reference image"} className="max-w-3xl">
        {challenge?.imageUrl ? <img src={challenge.imageUrl} alt={`${challenge.title} reference`} className="max-h-[70dvh] w-full rounded-xl object-contain" /> : <p className="text-text-secondary">{copy.imageUnavailable ?? "Reference image unavailable."}</p>}
      </Modal>
      <Modal open={Boolean(completion)} onClose={() => setCompletion(null)} title={copy.completed ?? "Puzzle completed"}>
        <div className="grid gap-4 text-center"><Check className="mx-auto h-10 w-10 text-accent" /><p className="text-text-secondary">{formatDuration(elapsed)} · {moves} {activeMode === "sliding" ? (copy.moves ?? "moves") : (copy.swaps ?? "swaps")}</p>{signedIn ? <p className="font-semibold text-text-primary">+{completion?.rewardEarned ?? 0} {copy.feathers ?? "Wren Feathers"}</p> : <p className="text-sm text-text-secondary">{copy.claimAfterSignIn ?? "Sign in to claim account Feathers."}</p>}{completion?.badges?.length ? <p className="text-sm text-text-secondary">{copy.newBadges ?? "New badges"}: {completion.badges.join(", ")}</p> : null}<div className="flex flex-wrap justify-center gap-2"><Button onClick={() => { if (challenge) void newGame(challenge, activeMode, activeGrid); }}><Play className="h-4 w-4" />{copy.playAgain ?? "Play again"}</Button><Button variant="secondary" onClick={() => { const index = initialChallenges.findIndex((item) => item.id === challengeId); setChallengeId(initialChallenges[(index + 1) % initialChallenges.length].id); setCompletion(null); }}>{copy.nextPuzzle ?? "Next puzzle"}</Button><Button variant="secondary" onClick={() => { if (navigator.share) void navigator.share({ title: "Oriana Puzzle Atelier", text: `${formatDuration(elapsed)} · ${moves}` }).catch(() => undefined); }}><Share2 className="h-4 w-4" />{copy.share ?? "Share result"}</Button></div></div>
      </Modal>
    </section>
  );
}

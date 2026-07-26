"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Music2,
  Pause,
  Sparkles,
  Volume2,
  VolumeX,
  Settings2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Button } from "@/components/ui/Button";
import type {
  GameCatalogEntry,
  GameClientProps,
  GameEngineStatus,
} from "@/games/core/types";
import { GameAudioProvider, useGameAudio } from "@/games/core/audio-context.client";
import { resolveGameQuality } from "@/games/core/quality";
import { acquireGameRuntimeSuspension } from "@/games/core/runtime";
import { loadGameClientModule, type LoadedGameComponent } from "@/games/loaders.client";

function AudioControls({ quality, onCycleQuality }: { quality: string, onCycleQuality: () => void }) {
  const audio = useGameAudio();
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Game audio controls">
      <Button
        variant="icon"
        aria-label={audio.volume > 0 ? "Mute game audio" : "Unmute game audio"}
        onClick={() => audio.setVolume(audio.volume > 0 ? 0 : 0.55)}
      >
        {audio.volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </Button>
      <label className="flex h-10 items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 text-xs text-text-secondary backdrop-blur-md">
        <span className="sr-only">Master volume</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={audio.volume}
          onChange={(event) => audio.setVolume(Number(event.target.value))}
          className="w-20 accent-[var(--preset-accent)]"
        />
      </label>
      <Button
        variant={audio.musicEnabled ? "primary" : "secondary"}
        aria-pressed={audio.musicEnabled}
        onClick={() => audio.setMusicEnabled(!audio.musicEnabled)}
      >
        <Music2 className="h-4 w-4" />
        Music
      </Button>
      <Button
        variant={audio.effectsEnabled ? "primary" : "secondary"}
        aria-pressed={audio.effectsEnabled}
        onClick={() => audio.setEffectsEnabled(!audio.effectsEnabled)}
      >
        <Sparkles className="h-4 w-4" />
        Effects
      </Button>
      <Button
        variant="secondary"
        onClick={onCycleQuality}
        title="Cycle Graphics Quality"
      >
        <Settings2 className="h-4 w-4" />
        {quality === "high" ? "High" : quality === "balanced" ? "Balanced" : "Low"}
      </Button>
    </div>
  );
}

function Player({
  game,
  initialGameProps,
}: {
  game: GameCatalogEntry;
  initialGameProps: Record<string, unknown>;
}) {
  const [Game, setGame] = useState<LoadedGameComponent | null>(null);
  const [status, setStatus] = useState<GameEngineStatus>("loading");
  const [loadError, setLoadError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [quality, setQuality] = useState<"low" | "balanced" | "high">("balanced");
  const resumeAfterVisibilityRef = useRef(false);
  const [manualQuality, setManualQuality] = useState<"low" | "balanced" | "high" | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("game:graphics:quality");
      if (stored !== "low" && stored !== "balanced" && stored !== "high") return;
      const frame = window.requestAnimationFrame(() => setManualQuality(stored));
      return () => window.cancelAnimationFrame(frame);
    } catch {}
  }, []);

  const cycleQuality = () => {
    const active = manualQuality || quality;
    const next = active === "high" ? "balanced" : active === "balanced" ? "low" : "high";
    setManualQuality(next);
    try { localStorage.setItem("game:graphics:quality", next); } catch {}
  };

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const updatePreferences = () => {
      const reduced = motion.matches;
      setReducedMotion(reduced);
      setQuality(resolveGameQuality({
        width: window.innerWidth,
        reducedMotion: reduced,
        saveData: "connection" in navigator
          && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData),
      }).tier);
    };
    updatePreferences();
    motion.addEventListener("change", updatePreferences);
    coarse.addEventListener("change", updatePreferences);
    return () => {
      motion.removeEventListener("change", updatePreferences);
      coarse.removeEventListener("change", updatePreferences);
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadGameClientModule(game.slug)
      .then((module) => {
        if (!active) return;
        setGame(() => module.default);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setLoadError("This game module could not be loaded.");
        setStatus("destroyed");
      });
    return () => {
      active = false;
    };
  }, [game.slug]);

  useEffect(() => {
    if (status !== "running") return;
    return acquireGameRuntimeSuspension(`game:${game.slug}`);
  }, [game.slug, status]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && status === "running") {
        resumeAfterVisibilityRef.current = true;
        setStatus("paused");
      } else if (!document.hidden && resumeAfterVisibilityRef.current) {
        resumeAfterVisibilityRef.current = false;
        setStatus("running");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [status]);

  const props = useMemo(() => ({
    ...initialGameProps,
    onEngineStatusChange: setStatus,
    reducedMotion,
    quality: manualQuality || quality,
  }), [initialGameProps, quality, manualQuality, reducedMotion]);

  const TypedGame = Game as ComponentType<GameClientProps & Record<string, unknown>> | null;

  return (
    <section
      data-game-route={game.slug}
      data-game-version={game.version}
      data-engine-status={status}
      className="mx-auto w-full max-w-[92rem] px-4 pb-20 pt-6 sm:px-6 lg:px-10"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/games">
          <Button variant="secondary"><ArrowLeft className="h-4 w-4" />Game Hub</Button>
        </Link>
        <AudioControls quality={manualQuality || quality} onCycleQuality={cycleQuality} />
      </div>
      <header className="mb-7 grid gap-3 border-b border-border/70 pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-text-secondary">
            {game.category} · {game.rewardMode === "practice" ? "Practice mode" : "Verified rewards"}
          </p>
          <h1 className="mt-2 font-serif text-4xl text-text-primary sm:text-5xl">{game.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">{game.description}</p>
        </div>
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-text-secondary">
          {status === "paused" && <Pause className="h-3.5 w-3.5" />}
          Engine {status}
        </p>
      </header>

      {game.rewardMode === "verified" && (
        <div className="mb-7 rounded-[1.2rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 text-sm leading-6 text-text-secondary backdrop-blur-md">
          <strong className="flex items-center gap-2 mb-2 text-text-primary">
            <Sparkles className="h-4 w-4 text-[var(--preset-accent)]" />
            Fair Reward System
          </strong>
          <p>
            This game uses a dynamic anti-inflation reward curve. Your Wren Feathers are calculated using a <em>Square Root</em> formula based on your final score and the game&apos;s difficulty multiplier.
            The higher your score, the harder it becomes to earn the next feather. Play fair and aim for the top!
          </p>
        </div>
      )}
      {loadError ? (
        <div className="rounded-[1.4rem] border border-border bg-surface/85 p-10 text-center text-text-secondary">
          {loadError}
        </div>
      ) : TypedGame ? (
        <TypedGame {...props} />
      ) : (
        <div className="flex min-h-[32rem] items-center justify-center rounded-[1.4rem] border border-border bg-surface/70">
          <span className="text-xs uppercase tracking-[0.2em] text-text-secondary">Preparing atelier…</span>
        </div>
      )}
    </section>
  );
}

export function GamePlayerShell(props: {
  game: GameCatalogEntry;
  initialGameProps?: Record<string, unknown>;
}) {
  return (
    <GameAudioProvider>
      <Player key={props.game.slug} game={props.game} initialGameProps={props.initialGameProps ?? {}} />
    </GameAudioProvider>
  );
}

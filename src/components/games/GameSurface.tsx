"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/Button";

export function GameSurface({
  canvasRef,
  title,
  status,
  score,
  detail,
  onStart,
  onPause,
  onRestart,
  children,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  title: string;
  status: "ready" | "running" | "paused" | "complete";
  score: string;
  detail: string;
  onStart(): void;
  onPause(): void;
  onRestart(): void;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--preset-surface)_88%,transparent)] shadow-2xl shadow-text-primary/10">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${title} game surface`}
          className="block aspect-[4/3] w-full touch-none select-none"
        />
        {status !== "running" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/45 p-5 backdrop-blur-[3px]">
            <div className="max-w-sm text-center">
              <p className="font-serif text-3xl text-text-primary">
                {status === "complete" ? "Session complete" : status === "paused" ? "Paused" : title}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{detail}</p>
              <Button className="mt-5" onClick={onStart}>
                <Play className="h-4 w-4" />
                {status === "ready" ? "Start" : status === "complete" ? "Play again" : "Resume"}
              </Button>
            </div>
          </div>
        )}
      </div>
      <aside className="grid content-start gap-4 rounded-[1.5rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 backdrop-blur-xl">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-text-secondary">Score</p>
          <p className="mt-1 font-serif text-4xl text-text-primary">{score}</p>
        </div>
        <p className="text-sm leading-6 text-text-secondary">{detail}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onPause} disabled={status !== "running"}>
            <Pause className="h-4 w-4" />Pause
          </Button>
          <Button variant="secondary" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" />Restart
          </Button>
        </div>
        {children}
        <p className="border-t border-border/70 pt-4 text-xs leading-5 text-text-secondary">
          Practice canaries do not grant Wren Feathers. No gameplay data leaves this browser.
        </p>
      </aside>
    </div>
  );
}

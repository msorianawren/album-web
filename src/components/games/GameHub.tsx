import Link from "next/link";
import { ArrowUpRight, Grid3X3, Leaf, Puzzle, Sparkles } from "lucide-react";
import type { GameCatalogEntry } from "@/games/core/types";

const icons = {
  snake: Leaf,
  "feather-merge": Sparkles,
  "memory-garden": Grid3X3,
  "puzzle-atelier": Puzzle,
} as const;

const artwork = {
  rose: "from-rose-200/70 via-pink-100/35 to-white/20",
  sage: "from-emerald-200/65 via-lime-100/30 to-white/20",
  amber: "from-amber-200/70 via-yellow-100/35 to-white/20",
  sky: "from-sky-200/65 via-indigo-100/30 to-white/20",
} as const;

export function GameHub({ games }: { games: readonly GameCatalogEntry[] }) {
  return (
    <section className="mx-auto w-full max-w-[92rem] px-4 pb-20 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <header className="grid gap-6 border-b border-border/70 pb-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
            Oriana Arcade Atelier
          </p>
          <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-[0.98] text-text-primary sm:text-6xl lg:text-7xl">
            Small worlds, made for a quiet pause.
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-7 text-text-secondary sm:text-base">
          Original puzzles and arcade studies with deterministic play, keyboard support,
          and touch controls. Canary games currently run in practice mode.
        </p>
      </header>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {games.map((game, index) => {
          const Icon = icons[game.slug as keyof typeof icons] ?? Sparkles;
          return (
            <Link
              key={game.id}
              href={`/games/${game.slug}`}
              data-game-card={game.slug}
              data-game-status={game.status}
              className="group relative min-h-[28rem] overflow-hidden rounded-[1.5rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 shadow-xl shadow-text-primary/5 transition duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-text-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className={`relative flex h-64 items-center justify-center overflow-hidden rounded-[1.15rem] bg-gradient-to-br ${artwork[game.accent]}`}>
                <div className="absolute inset-6 rounded-full border border-white/50 opacity-60 transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-12 rotate-12 rounded-full border border-text-primary/10 transition duration-700 group-hover:-rotate-6" />
                <Icon className="h-16 w-16 text-text-primary/75 transition duration-500 group-hover:scale-110" strokeWidth={1.15} />
                <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-white/55 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-text-primary backdrop-blur-md">
                  {game.rewardMode === "practice" ? "Practice canary" : "Legacy atelier"}
                </span>
                <span className="absolute bottom-4 right-4 font-serif text-5xl text-text-primary/15">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 px-1 pb-2 pt-6">
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-text-secondary">
                    {game.category} · v{game.version}
                  </p>
                  <h2 className="mt-2 font-serif text-3xl leading-tight text-text-primary">{game.title}</h2>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface/70 text-text-primary transition group-hover:bg-accent group-hover:text-accent-foreground">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="px-1 text-sm leading-6 text-text-secondary">{game.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

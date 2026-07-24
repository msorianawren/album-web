import Link from "next/link";
import { ArrowUpRight, BadgeCheck, FlaskConical, History } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { GameCatalogEntry } from "@/games/core/types";

export function GamePlatformCatalog({ games }: { games: readonly GameCatalogEntry[] }) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            Game platform
          </p>
          <h2 className="mt-1 font-serif text-3xl text-text-primary">Catalog and published versions</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Code-backed canaries are practice-only until their server verifier and reward policy are activated.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary">
          {games.length} registered games
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {games.map((game) => (
          <article
            key={game.id}
            className="grid gap-4 rounded-[1.4rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-2xl text-text-primary">{game.title}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  {game.status === "published" ? <BadgeCheck className="h-3 w-3" /> : <History className="h-3 w-3" />}
                  {game.status}
                </span>
                {game.rewardMode === "practice" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/70 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-amber-950">
                    <FlaskConical className="h-3 w-3" />Practice
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{game.description}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                <div><dt className="uppercase tracking-[0.12em]">Version</dt><dd className="mt-1 text-text-primary">{game.version}</dd></div>
                <div><dt className="uppercase tracking-[0.12em]">Engine</dt><dd className="mt-1 text-text-primary">{game.engineKey}</dd></div>
              </dl>
            </div>
            <Link href={`/games/${game.slug}`} target="_blank">
              <Button variant="secondary"><ArrowUpRight className="h-4 w-4" />Open</Button>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

"use client";

import type { CollaboratorProfile } from "@/lib/types";

export function HomeCollaborators({ collaborators }: { collaborators: CollaboratorProfile[] }) {
  const displayCollaborators = [...collaborators].filter(c => c.enabled).sort((a, b) => a.order - b.order);

  if (displayCollaborators.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1000px] px-6 py-24 sm:py-32">
      <div className="mb-16 text-center">
        <h2 className="font-serif text-3xl font-light text-text-primary sm:text-4xl">
          Creative Partners
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-secondary">
          Selected collaborators who help shape the visual narrative.
        </p>
      </div>

      <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {displayCollaborators.map((collab) => (
          <div key={collab.id} className="group flex flex-col items-center text-center">
            <div className="relative mb-6 h-40 w-40 overflow-hidden rounded-full border border-border/50 bg-surface/50">
              {collab.portrait_url ? (
                <img
                  src={collab.portrait_url}
                  alt={collab.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-serif text-text-secondary/50">
                  {collab.name.charAt(0)}
                </div>
              )}
            </div>
            <h3 className="text-lg font-medium text-text-primary">{collab.name}</h3>
            <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
              {collab.role}
            </span>
            {collab.bio && (
              <p className="mt-4 text-sm leading-relaxed text-text-secondary/80">
                {collab.bio}
              </p>
            )}
            {collab.portfolio_url && (
              <a
                href={collab.portfolio_url}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center text-xs font-medium uppercase tracking-[0.15em] text-text-primary transition-colors hover:text-accent"
              >
                View Work
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

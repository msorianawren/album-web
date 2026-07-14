"use client";

import { useState } from "react";
import { AssistantPet } from "@/components/assistant/AssistantPet";
import {
  assistantCharacterIds,
  assistantMascotGroupLabels,
  assistantMascots,
  assistantMoodLabels,
  DEFAULT_ASSISTANT_CHARACTER,
  type AssistantCharacter,
  type AssistantMascotGroup,
  type AssistantMood,
} from "@/lib/assistant/mascots";
import { cn } from "@/lib/utils";

const moods = Object.keys(assistantMoodLabels) as AssistantMood[];
const mascotGroupOrder: AssistantMascotGroup[] = ["animals", "chibi_roles"];

export function AssistantMascotPreview() {
  const [selectedCharacter, setSelectedCharacter] = useState<AssistantCharacter>(
    DEFAULT_ASSISTANT_CHARACTER,
  );
  const selectedMascot = assistantMascots[selectedCharacter];

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.4rem] border border-border bg-surface/80 p-5 shadow-xl shadow-text-primary/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
              Mascot roster
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">
              Oriana Companion Foundation
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Public SVG mascots with shared CSS moods. Static cards keep this preview light.
            </p>
          </div>
          <div className="rounded-full border border-border bg-background px-4 py-2 text-xs text-text-secondary">
            {assistantCharacterIds.length} characters
          </div>
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/80 p-5 shadow-xl shadow-text-primary/5">
        <div className="space-y-5">
          {mascotGroupOrder.map((group) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {assistantMascotGroupLabels[group]}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
                {assistantCharacterIds
                  .filter((characterId) => assistantMascots[characterId].group === group)
                  .map((characterId) => {
                    const mascot = assistantMascots[characterId];
                    const selected = selectedCharacter === characterId;
                    return (
                      <button
                        key={characterId}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedCharacter(characterId)}
                        className={cn(
                          "rounded-[1rem] border bg-background/60 p-3 text-left transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected ? "border-accent" : "border-border",
                        )}
                      >
                        <span className="flex h-16 w-16 items-center justify-center rounded-[1rem] border border-border bg-surface/70">
                          {/* Static admin roster previews avoid rendering 20 animated pets at once. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mascot.src}
                            alt=""
                            width={48}
                            height={48}
                            loading="lazy"
                            decoding="async"
                            className="h-12 w-12 object-contain"
                          />
                        </span>
                        <span className="mt-3 block text-sm font-semibold text-text-primary">
                          {mascot.name}
                        </span>
                        <span className="mt-1 block text-xs text-text-secondary">
                          {mascot.personalityLabel}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/80 p-5 shadow-xl shadow-text-primary/5">
        <div className="mb-5 flex items-center gap-4">
          <AssistantPet character={selectedMascot.id} mood="idle" size="md" decorative />
          <div>
            <h3 className="text-xl font-semibold text-text-primary">{selectedMascot.name}</h3>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {selectedMascot.description}
            </p>
            <p className="mt-1 font-mono text-xs text-text-secondary">{selectedMascot.src}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {moods.map((mood) => (
            <div
              key={mood}
              className="flex items-center gap-3 rounded-[1rem] border border-border bg-background/60 p-4"
            >
              <AssistantPet character={selectedMascot.id} mood={mood} size="sm" decorative />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {assistantMoodLabels[mood]}
                </p>
                <p className="font-mono text-[0.7rem] text-text-secondary">{mood}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

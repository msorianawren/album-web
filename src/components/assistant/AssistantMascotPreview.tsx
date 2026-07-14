import { AssistantPet } from "@/components/assistant/AssistantPet";
import {
  assistantMascots,
  assistantMoodLabels,
  type AssistantMood,
} from "@/lib/assistant/mascots";

const moods = Object.keys(assistantMoodLabels) as AssistantMood[];

export function AssistantMascotPreview() {
  return (
    <div className="grid gap-6">
      <section className="rounded-[1.4rem] border border-border bg-surface/80 p-5 shadow-xl shadow-text-primary/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
              Mascot MVP
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">
              Oriana Companion Foundation
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Lightweight SVG pets rendered by public URL, with CSS-only moods and reduced motion support.
            </p>
          </div>
          <div className="rounded-full border border-border bg-background px-4 py-2 text-xs text-text-secondary">
            Reduced motion disables movement.
          </div>
        </div>
      </section>

      {Object.values(assistantMascots).map((mascot) => (
        <section key={mascot.id} className="rounded-[1.4rem] border border-border bg-surface/80 p-5 shadow-xl shadow-text-primary/5">
          <div className="mb-5 flex items-center gap-4">
            <AssistantPet character={mascot.id} mood="idle" size="md" decorative />
            <div>
              <h3 className="text-xl font-semibold text-text-primary">{mascot.name}</h3>
              <p className="mt-1 text-sm leading-6 text-text-secondary">{mascot.description}</p>
              <p className="mt-1 font-mono text-xs text-text-secondary">{mascot.src}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {moods.map((mood) => (
              <div key={mood} className="flex items-center gap-3 rounded-[1rem] border border-border bg-background/60 p-4">
                <AssistantPet character={mascot.id} mood={mood} size="sm" decorative />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{assistantMoodLabels[mood]}</p>
                  <p className="font-mono text-[0.7rem] text-text-secondary">{mood}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

import type { AboutProfile } from "@/lib/types";

export function HomePersonalLetter({ profile }: { profile: AboutProfile }) {
  const quote = profile.quote || "Art is not what you see, but what you make others see.";

  return (
    <section className="mx-auto w-full max-w-[800px] px-6 py-32 text-center">
      <div className="relative">
        <span className="absolute -top-12 left-1/2 -translate-x-1/2 font-serif text-8xl text-border/40">
          &quot;
        </span>
        <p className="relative z-10 font-serif text-2xl font-light italic leading-relaxed text-text-primary sm:text-3xl sm:leading-loose">
          {quote}
        </p>
        <div className="mt-12 flex flex-col items-center gap-2">
          <span className="h-px w-12 bg-text-primary/20" />
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-text-primary mt-4">
            {profile.display_name || "Oriana Wren"}
          </span>
        </div>
      </div>
    </section>
  );
}

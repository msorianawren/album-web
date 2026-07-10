import type { AboutProfile } from "@/lib/types";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function HomePersonalLetter({ profile }: { profile: AboutProfile }) {
  const quote = profile.quote || "Art is not what you see, but what you make others see.";

  return (
    <ScrollReveal className="mx-auto w-full px-6 py-32 md:py-48 text-center" delay={0.2} duration={1.2}>
      <div className="max-w-[900px] mx-auto relative">
        <span className="block font-serif text-5xl md:text-7xl text-text-secondary/10 mb-6" aria-hidden="true">&ldquo;</span>
        <p className="relative z-10 font-serif text-[1.8rem] sm:text-4xl lg:text-[3rem] font-light italic leading-snug text-text-primary">
          {quote}
        </p>
        <div className="mt-16 flex flex-col items-center gap-4">
          <span className="h-px w-16 bg-text-primary/20" />
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-text-primary mt-2">
            {profile.display_name || "Oriana Wren"}
          </span>
        </div>
      </div>
    </ScrollReveal>
  );
}

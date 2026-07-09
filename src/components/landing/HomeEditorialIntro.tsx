import type { LandingPageContent } from "@/lib/types";

export function HomeEditorialIntro({ landing }: { landing: LandingPageContent }) {
  return (
    <section className="relative mx-auto w-full max-w-[800px] px-6 py-24 sm:py-32 text-center">
      <h2 className="animate-editorial-in font-serif text-3xl font-light italic leading-relaxed text-text-primary sm:text-4xl sm:leading-loose">
        {landing.body || "A private visual archive for portraits, travel diaries, traditional Vietnamese attire, cinematic concepts, and selected personal albums."}
      </h2>
      <div className="mt-12 flex justify-center">
        <span className="h-16 w-[1px] bg-gradient-to-b from-border to-transparent" />
      </div>
    </section>
  );
}

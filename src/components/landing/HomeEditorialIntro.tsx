import type { LandingPageContent, SiteSettings } from "@/lib/types";

export function HomeEditorialIntro({ landing }: { landing: LandingPageContent; settings?: SiteSettings }) {
  return (
    <section className="relative mx-auto w-full max-w-[800px] px-6 py-32 md:py-48 text-center">
      <h2 className="animate-editorial-in font-serif text-[1.6rem] md:text-[2.2rem] lg:text-[2.6rem] font-light italic leading-[1.6] text-text-primary">
        {landing.body || "A private visual archive for portraits, travel diaries, traditional Vietnamese attire, cinematic concepts, and selected personal albums."}
      </h2>
      <div className="mt-16 flex justify-center">
        <span className="h-20 w-[1px] bg-gradient-to-b from-text-primary/20 to-transparent" />
      </div>
    </section>
  );
}

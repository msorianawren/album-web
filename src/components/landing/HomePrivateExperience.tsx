import { Lock, Eye } from "lucide-react";

export function HomePrivateExperience() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-24 sm:py-32">
      <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <div className="relative">
          <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-surface-secondary/40 border border-border/50 relative">
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <span className="h-px w-24 bg-text-primary/10 mb-6" />
              <h2 className="font-serif text-[1.8rem] md:text-[2.2rem] text-text-primary/40 italic leading-snug">
                The Album<br />Experience
              </h2>
              <span className="h-px w-24 bg-text-primary/10 mt-6" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-12">
          <div className="flex gap-6">
            <div className="shrink-0 mt-1">
              <Eye className="h-5 w-5 text-text-secondary/50" />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-text-primary mb-3">
                Public Journals
              </h3>
              <p className="text-[0.95rem] leading-[1.8] text-text-secondary font-light max-w-[400px]">
                Selected portfolios, travel diaries, and conceptual narratives are open to all visitors. Many of these collections evolve naturally over time as new moments are added to the archives.
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="shrink-0 mt-1">
              <Lock className="h-5 w-5 text-text-secondary/50" />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-text-primary mb-3">
                Private Archives
              </h3>
              <p className="text-[0.95rem] leading-[1.8] text-text-secondary font-light max-w-[400px]">
                Exclusive client work and personal collections are protected to ensure discretion. You may request access to view these secured albums by authenticating with your Google account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

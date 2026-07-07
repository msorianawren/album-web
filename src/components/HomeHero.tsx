import { ArrowRight, Sparkles } from "lucide-react";

export function HomeHero() {
  return (
    <section className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-14 sm:px-8 md:py-20 lg:min-h-[720px] lg:grid-cols-[0.95fr_1.05fr] lg:px-12">
      <div className="flex flex-col justify-center animate-editorial-in">
        <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
          <Sparkles className="h-3.5 w-3.5 text-muted-accent" aria-hidden="true" />
          Oriana Wren
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.02em] text-text-primary sm:text-7xl">
          Professional Model
        </h1>
        <p className="mt-6 max-w-xl text-2xl leading-9 text-text-primary/80">
          Creating timeless visual stories through light, form & emotion.
        </p>
        <p className="mt-5 max-w-2xl text-base leading-8 text-text-secondary">
          Explore selected editorial campaigns, studio portraits, moving images,
          and private client albums in a calm, cinematic portfolio space.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="#albums"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-medium uppercase tracking-[0.16em] text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-text-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
          >
            View portfolio
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="relative min-h-[420px] overflow-hidden rounded-[2.4rem] border border-border bg-surface/50 p-3 shadow-2xl shadow-text-primary/10 animate-editorial-in [animation-delay:160ms]">
        <div className="absolute inset-3 grid grid-cols-2 gap-3">
          <div className="overflow-hidden rounded-[1.8rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=1000&q=85"
              alt="Editorial portrait preview"
              className="h-full w-full object-cover transition duration-700 hover:scale-[1.04]"
            />
          </div>
          <div className="grid gap-3">
            <div className="overflow-hidden rounded-[1.8rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85"
                alt="Studio fashion album preview"
                className="h-full w-full object-cover transition duration-700 hover:scale-[1.04]"
              />
            </div>
            <div className="overflow-hidden rounded-[1.8rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=85"
                alt="Cinematic fashion story preview"
                className="h-full w-full object-cover transition duration-700 hover:scale-[1.04]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

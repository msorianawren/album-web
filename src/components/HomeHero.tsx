import { ArrowRight, Camera, Play, Sparkles } from "lucide-react";
import type { LandingPageContent } from "@/lib/types";

interface HomeHeroProps {
  landing: LandingPageContent;
}

export function HomeHero({ landing }: HomeHeroProps) {
  const primaryHref = landing.primary_cta_href === "#albums" ? "/albums" : landing.primary_cta_href;
  const secondaryHref = landing.secondary_cta_href === "#albums" ? "/albums" : landing.secondary_cta_href;
  const stats = [
    { label: landing.stat_one_label, value: landing.stat_one_value },
    { label: landing.stat_two_label, value: landing.stat_two_value },
    { label: landing.stat_three_label, value: landing.stat_three_value },
  ];

  return (
    <section className="relative isolate overflow-hidden">
      <div className="page-shell-1440 grid min-w-0 gap-8 pb-10 pt-8 md:pb-16 md:pt-16 lg:min-h-[760px] lg:grid-cols-[0.86fr_1.14fr]">
        <div className="relative z-10 flex min-w-0 flex-col justify-center animate-editorial-in">
          <p className="mb-5 inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-[0.68rem] font-semibold uppercase text-text-secondary shadow-sm backdrop-blur sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 text-muted-accent" aria-hidden="true" />
            <span className="truncate">Premium model portfolio</span>
          </p>
          <h1 className="max-w-3xl break-words text-[3.2rem] font-semibold leading-[0.92] text-text-primary sm:text-7xl lg:text-8xl">
            Oriana Wren
          </h1>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.28em] text-text-secondary">
            Professional Model
          </p>
          <p className="mt-6 max-w-2xl break-words text-xl leading-8 text-text-primary/86 sm:text-3xl sm:leading-10">
            Creating timeless visual stories through light, form & emotion.
          </p>
          <p className="mt-5 max-w-2xl break-words text-base leading-8 text-text-secondary">
            {landing.body}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={primaryHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold uppercase text-accent-foreground shadow-2xl shadow-text-primary/10 transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
            >
              {landing.primary_cta_label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={secondaryHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface/75 px-6 text-sm font-semibold uppercase text-text-primary shadow-lg shadow-text-primary/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {landing.secondary_cta_label}
            </a>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-1 overflow-hidden rounded-[1.4rem] border border-border bg-surface/60 shadow-xl shadow-text-primary/5 backdrop-blur sm:mt-10 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={`${stat.label}-${stat.value}`} className="min-w-0 border-b border-border p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <p className="break-words text-lg font-semibold text-text-primary">{stat.value}</p>
                <p className="mt-1 break-words text-[0.68rem] font-semibold uppercase text-text-secondary">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative grid gap-4 animate-editorial-in [animation-delay:160ms] sm:min-h-[500px] lg:min-h-[680px]">
          <div className="relative h-[28rem] overflow-hidden rounded-[1.6rem] border border-border bg-surface/50 shadow-2xl shadow-text-primary/10 sm:absolute sm:inset-x-10 sm:top-0 sm:h-[74%] sm:rounded-[2.2rem] lg:inset-x-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={landing.hero_image_url}
              alt=""
              className="hero-image-pan h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(0,0,0,0.42))]" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white sm:bottom-5 sm:left-5 sm:right-5 sm:items-center">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase opacity-80">Featured story</p>
                <p className="mt-1 line-clamp-2 text-base font-semibold sm:text-lg">{landing.feature_title}</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur sm:h-12 sm:w-12">
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="relative w-full overflow-hidden rounded-[1.4rem] border border-border bg-surface p-2 shadow-2xl shadow-text-primary/12 sm:absolute sm:bottom-0 sm:left-0 sm:w-[46%] sm:rounded-[1.6rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={landing.portrait_image_url}
              alt=""
              className="aspect-[4/5] w-full rounded-[1.15rem] object-cover transition duration-700 hover:scale-[1.03]"
            />
          </div>

          <div className="relative w-full rounded-[1.4rem] border border-border bg-surface/90 p-3 shadow-2xl shadow-text-primary/10 backdrop-blur sm:absolute sm:bottom-8 sm:right-0 sm:w-[52%] sm:rounded-[1.6rem]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.8fr_1fr]">
              <div className="overflow-hidden rounded-[1.1rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={landing.gallery_image_url}
                  alt=""
                  className="aspect-[4/5] h-full w-full object-cover transition duration-700 hover:scale-[1.04]"
                />
              </div>
              <div className="flex min-w-0 flex-col justify-between p-2">
                <p className="text-xs font-semibold uppercase text-text-secondary">
                  Studio note
                </p>
                <p className="mt-2 text-sm leading-6 text-text-primary">
                  {landing.feature_body}
                </p>
                <span className="mt-4 h-1.5 w-16 rounded-full bg-muted-accent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { ArrowRight, Camera, Play, Sparkles } from "lucide-react";
import type { LandingPageContent } from "@/lib/types";

interface HomeHeroProps {
  landing: LandingPageContent;
}

export function HomeHero({ landing }: HomeHeroProps) {
  const stats = [
    { label: landing.stat_one_label, value: landing.stat_one_value },
    { label: landing.stat_two_label, value: landing.stat_two_value },
    { label: landing.stat_three_label, value: landing.stat_three_value },
  ];

  return (
    <section className="relative isolate overflow-hidden">
      <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 pb-10 pt-10 sm:px-8 md:pb-16 md:pt-16 lg:min-h-[760px] lg:grid-cols-[0.86fr_1.14fr] lg:px-12">
        <div className="relative z-10 flex flex-col justify-center animate-editorial-in">
          <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-xs font-semibold uppercase text-text-secondary shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-muted-accent" aria-hidden="true" />
            {landing.eyebrow}
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[0.96] text-text-primary sm:text-7xl lg:text-8xl">
            {landing.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-text-primary/80 sm:text-2xl sm:leading-9">
            {landing.subheadline}
          </p>
          <p className="mt-5 max-w-2xl text-base leading-8 text-text-secondary">
            {landing.body}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={landing.primary_cta_href}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold uppercase text-accent-foreground shadow-2xl shadow-text-primary/10 transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
            >
              {landing.primary_cta_label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={landing.secondary_cta_href}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface/75 px-6 text-sm font-semibold uppercase text-text-primary shadow-lg shadow-text-primary/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {landing.secondary_cta_label}
            </a>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-3 overflow-hidden rounded-[1.4rem] border border-border bg-surface/60 shadow-xl shadow-text-primary/5 backdrop-blur">
            {stats.map((stat) => (
              <div key={`${stat.label}-${stat.value}`} className="border-r border-border p-4 last:border-r-0">
                <p className="text-lg font-semibold text-text-primary">{stat.value}</p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase text-text-secondary">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[500px] animate-editorial-in [animation-delay:160ms] lg:min-h-[680px]">
          <div className="absolute inset-x-4 top-0 h-[74%] overflow-hidden rounded-[2.2rem] border border-border bg-surface/50 shadow-2xl shadow-text-primary/10 sm:inset-x-10 lg:inset-x-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={landing.hero_image_url}
              alt=""
              className="hero-image-pan h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(0,0,0,0.42))]" />
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-4 text-white">
              <div>
                <p className="text-xs font-semibold uppercase opacity-80">Featured story</p>
                <p className="mt-1 text-lg font-semibold">{landing.feature_title}</p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur">
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-[46%] overflow-hidden rounded-[1.6rem] border border-border bg-surface p-2 shadow-2xl shadow-text-primary/12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={landing.portrait_image_url}
              alt=""
              className="aspect-[4/5] w-full rounded-[1.15rem] object-cover transition duration-700 hover:scale-[1.03]"
            />
          </div>

          <div className="absolute bottom-8 right-0 w-[52%] rounded-[1.6rem] border border-border bg-surface/90 p-3 shadow-2xl shadow-text-primary/10 backdrop-blur">
            <div className="grid grid-cols-[0.8fr_1fr] gap-3">
              <div className="overflow-hidden rounded-[1.1rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={landing.gallery_image_url}
                  alt=""
                  className="aspect-[4/5] h-full w-full object-cover transition duration-700 hover:scale-[1.04]"
                />
              </div>
              <div className="flex flex-col justify-between p-2">
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

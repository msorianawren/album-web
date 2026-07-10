import { ArrowRight, Camera, Play, Sparkles } from "lucide-react";
import type { LandingPageContent, SiteSettings } from "@/lib/types";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface HomeHeroProps {
  landing: LandingPageContent;
  settings?: SiteSettings;
  locale?: string;
  dict?: any;
}

export function HomeHero({ landing, settings, locale = "en", dict }: HomeHeroProps) {
  const trans = landing.translations?.[locale] || {};
  const headline = trans.headline || landing.headline;
  const eyebrow = trans.eyebrow || landing.eyebrow;
  const subheadline = trans.subheadline || landing.subheadline;
  const body = trans.body || landing.body;
  const primaryCtaLabel = trans.primary_cta_label || landing.primary_cta_label;
  const secondaryCtaLabel = trans.secondary_cta_label || landing.secondary_cta_label;
  const featureTitle = trans.feature_title || landing.feature_title;
  const featureBody = trans.feature_body || landing.feature_body;
  
  const stats = [
    { label: trans.stat_one_label || landing.stat_one_label, value: trans.stat_one_value || landing.stat_one_value },
    { label: trans.stat_two_label || landing.stat_two_label, value: trans.stat_two_value || landing.stat_two_value },
    { label: trans.stat_three_label || landing.stat_three_label, value: trans.stat_three_value || landing.stat_three_value },
  ];

  const primaryHref = landing.primary_cta_href === "#albums" ? "/albums" : landing.primary_cta_href;
  const secondaryHref = landing.secondary_cta_href === "#albums" ? "/albums" : landing.secondary_cta_href;

  const preset = settings?.homepage_hero_preset || "cinematic";

  if (preset === "editorial") {
    // Editorial Preset (Focus on typography and large portrait)
    return (
      <section className="relative isolate overflow-hidden min-h-[90vh] flex flex-col justify-center py-20 lg:py-32">
        <div className="page-shell-1440 grid min-w-0 gap-16 lg:grid-cols-[1.2fr_0.8fr] items-center">
          <ScrollReveal className="relative z-10 flex min-w-0 flex-col justify-center order-2 lg:order-1">
            <p className="mb-8 text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">
              {eyebrow}
            </p>
            <h1 className="max-w-4xl break-words font-serif text-[4rem] sm:text-7xl lg:text-[7.5rem] leading-[0.85] text-text-primary mb-8">
              {headline}
            </h1>
            <p className="max-w-2xl break-words font-serif italic text-2xl sm:text-3xl lg:text-4xl leading-tight text-text-secondary/80 mb-10">
              {subheadline}
            </p>
            <p className="max-w-xl break-words text-[1.05rem] leading-[1.8] text-text-secondary font-light">
              {body}
            </p>
            <div className="mt-12 flex flex-wrap gap-8 items-center border-t border-border/50 pt-8">
              <a
                href={primaryHref}
                className="group flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-text-primary hover:text-accent transition-colors duration-300"
              >
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
              <a
                href={secondaryHref}
                className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-text-secondary hover:text-text-primary transition-colors duration-300"
              >
                <Camera className="h-4 w-4 opacity-50" aria-hidden="true" />
                {secondaryCtaLabel}
              </a>
            </div>
          </ScrollReveal>
          
          <ScrollReveal delay={0.2} className="relative z-0 order-1 lg:order-2">
            <div className="relative w-full aspect-[3/4] overflow-hidden rounded-[2rem] bg-surface-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={landing.portrait_image_url} alt="" className="h-full w-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end border-t border-white/20 pt-4">
                 <div>
                   <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/70 mb-1">{dict?.landing?.featured_story || "Featured story"}</p>
                   <p className="font-serif italic text-white text-xl">{featureTitle}</p>
                 </div>
                 <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 backdrop-blur-md">
                   <Play className="h-4 w-4 fill-white text-white" aria-hidden="true" />
                 </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    );
  }

  if (preset === "minimal") {
    return (
      <section className="relative isolate overflow-hidden min-h-[70vh] flex flex-col justify-center py-32 text-center">
        <div className="page-shell-1440 flex flex-col items-center">
          <ScrollReveal className="relative z-10 flex min-w-0 flex-col items-center max-w-4xl mx-auto">
            <h1 className="max-w-4xl break-words text-[3.5rem] font-light leading-[1.05] text-text-primary sm:text-6xl lg:text-[6.5rem]">
              {headline}
            </h1>
            <p className="mt-8 max-w-2xl break-words text-[1.1rem] leading-8 text-text-secondary/90 font-light">
              {subheadline}
            </p>
            <div className="mt-12 flex flex-col gap-4 sm:flex-row justify-center w-full">
              <a
                href={primaryHref}
                className="inline-flex h-12 items-center justify-center gap-2 px-8 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-text-primary border border-border/50 hover:bg-surface/50 transition-all duration-300"
              >
                {primaryCtaLabel}
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    );
  }

  if (preset === "split") {
    return (
      <section className="relative isolate overflow-hidden min-h-[90vh] flex flex-col justify-center">
        <div className="grid min-w-0 lg:grid-cols-2 h-full absolute inset-0">
          <div className="relative hidden lg:block h-full">
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src={landing.hero_image_url} alt="" className="h-full w-full object-cover grayscale-[30%] opacity-90" />
             <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background" />
          </div>
          <div className="flex flex-col justify-center px-6 sm:px-16 lg:px-24 xl:px-32 relative z-10 bg-background/80 lg:bg-transparent pt-32 pb-20 lg:py-0">
             <ScrollReveal className="max-w-2xl">
                <p className="mb-6 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-text-secondary">
                  {eyebrow}
                </p>
                <h1 className="text-[3rem] font-medium leading-[1.1] text-text-primary sm:text-5xl lg:text-6xl mb-6">
                  {headline}
                </h1>
                <p className="text-lg leading-relaxed text-text-secondary/90 mb-10">
                  {subheadline}
                </p>
                <div className="flex items-center gap-6">
                  <a
                    href={primaryHref}
                    className="inline-flex h-11 items-center justify-center bg-text-primary text-background px-6 text-[0.75rem] font-semibold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5"
                  >
                    {primaryCtaLabel}
                  </a>
                  <a
                    href={secondaryHref}
                    className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {secondaryCtaLabel}
                  </a>
                </div>
             </ScrollReveal>
          </div>
        </div>
      </section>
    );
  }

  // Default Cinematic (or anything else)
  return (
    <section className="relative isolate overflow-hidden">
      <div className="page-shell-1440 grid min-w-0 gap-8 pb-10 pt-8 md:pb-16 md:pt-16 lg:min-h-[760px] lg:grid-cols-[0.86fr_1.14fr]">
        <ScrollReveal className="relative z-10 flex min-w-0 flex-col justify-center">
          <p className="mb-5 inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-[0.68rem] font-semibold uppercase text-text-secondary shadow-sm backdrop-blur-md sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 text-muted-accent" aria-hidden="true" />
            <span className="truncate">{dict?.landing?.premium_portfolio || "Premium model portfolio"}</span>
          </p>
          <h1 className="max-w-3xl break-words text-[3.2rem] font-semibold leading-[0.92] text-text-primary sm:text-7xl lg:text-8xl">
            {headline}
          </h1>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.28em] text-text-secondary">
            {eyebrow}
          </p>
          <p className="mt-6 max-w-2xl break-words text-xl leading-8 text-text-primary/86 sm:text-3xl sm:leading-10">
            {subheadline}
          </p>
          <p className="mt-5 max-w-2xl break-words text-base leading-8 text-text-secondary">
            {body}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <a
              href={primaryHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold uppercase text-accent-foreground shadow-2xl shadow-text-primary/10 transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
            >
              {primaryCtaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={secondaryHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-6 text-sm font-semibold uppercase text-text-primary shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {secondaryCtaLabel}
            </a>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-1 overflow-hidden rounded-[1.4rem] border border-border bg-surface/60 shadow-xl shadow-text-primary/5 backdrop-blur sm:mt-10 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={`${stat.label}-${stat.value}`} className="min-w-0 border-b border-border p-4 transition-colors hover:bg-surface/80 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <p className="break-words text-lg font-semibold text-text-primary">{stat.value}</p>
                <p className="mt-1 break-words text-[0.68rem] font-semibold uppercase text-text-secondary">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="relative z-0 hidden lg:block animate-editorial-in-slow sm:min-h-[500px] lg:min-h-[680px]">
          <div data-nature-surface="hero-frame" className="relative h-[28rem] overflow-hidden rounded-[1.6rem] border border-border bg-surface/50 shadow-2xl shadow-text-primary/10 sm:absolute sm:inset-x-10 sm:top-0 sm:h-[74%] sm:rounded-[2.2rem] lg:inset-x-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={landing.hero_image_url}
              alt=""
              className="hero-image-pan h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(0,0,0,0.42))]" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white sm:bottom-5 sm:left-5 sm:right-5 sm:items-center">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase opacity-80">{dict?.landing?.featured_story || "Featured story"}</p>
                <p className="mt-1 line-clamp-2 text-base font-semibold sm:text-lg">{featureTitle}</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur sm:h-12 sm:w-12">
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div data-nature-surface="hero-frame" className="relative w-full overflow-hidden rounded-[1.4rem] border border-border bg-surface p-2 shadow-2xl shadow-text-primary/12 sm:absolute sm:bottom-0 sm:left-0 sm:w-[46%] sm:rounded-[1.6rem]">
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
                  {dict?.landing?.studio_note || "Studio note"}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-primary">
                  {featureBody}
                </p>
                <span className="mt-4 h-1.5 w-16 rounded-full bg-muted-accent" />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import type { LandingSocialLink, SiteSettings } from "@/lib/types";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
  ),
  Facebook: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
  ),
  Threads: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10c0 1.5-.5 3-1.5 4.5S17 19 15.5 19c-1 0-1.5-.5-1.5-1.5V12a3.5 3.5 0 1 0-4.5 3.33"/></svg>
  ),
  TikTok: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
  ),
  Telegram: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
  ),
};

export function SocialLinksTree({ links, settings }: { links: LandingSocialLink[]; settings?: SiteSettings }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vineRef = useRef<SVGPathElement>(null);
  const displayLinks = useMemo(
    () => [...links].filter((link) => link.enabled && link.url.trim() !== "").sort((a, b) => a.order - b.order),
    [links],
  );
  const stylePreset = settings?.social_tree_style || "botanical";

  useEffect(() => {
    const container = containerRef.current;
    if (!container || displayLinks.length === 0) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const context = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".social-card");
      const branches = gsap.utils.toArray<SVGElement>(".social-branch");

      if (prefersReducedMotion) {
        gsap.set(cards, { opacity: 1, y: 0 });
        gsap.set(branches, { opacity: 1, scaleX: 1 });
        if (vineRef.current) gsap.set(vineRef.current, { strokeDasharray: "none", strokeDashoffset: 0 });
        return;
      }

      if (vineRef.current) {
        const length = vineRef.current.getTotalLength() || 2000;
        gsap.fromTo(
          vineRef.current,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: container,
              start: "top 80%",
              end: "bottom 90%",
              scrub: 0.5,
            },
          },
        );
      }

      gsap.fromTo(cards, { opacity: 0, y: 30 }, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: { trigger: container, start: "top 75%", toggleActions: "play none none none" },
      });

      gsap.fromTo(branches, { opacity: 0, scaleX: 0 }, {
        opacity: 1,
        scaleX: 1,
        transformOrigin: (_index, element) => element.classList.contains("branch-left") ? "right center" : "left center",
        duration: 0.6,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: { trigger: container, start: "top 75%", toggleActions: "play none none none" },
      });
    }, container);

    return () => context.revert();
  }, [displayLinks.length, stylePreset]);

  if (displayLinks.length === 0) return null;

  if (stylePreset === "clean" || stylePreset === "grid") {
    return (
      <section ref={containerRef} className="relative z-20 mx-auto w-full max-w-[1000px] bg-transparent px-6 py-24 text-center md:py-32">
        <div className="mb-16">
          <h2 className="font-serif text-3xl font-normal italic text-text-primary drop-shadow-sm sm:text-5xl">Connect</h2>
        </div>
        <div className={`grid gap-4 ${stylePreset === "grid" ? "grid-cols-2 sm:grid-cols-3" : "mx-auto max-w-[600px] grid-cols-1 sm:grid-cols-2"}`}>
          {displayLinks.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="social-card group flex items-center justify-center gap-4 rounded-full border border-border/40 bg-surface/22 px-6 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-text-primary/30 hover:bg-surface/38">
              <div className="text-text-secondary transition-colors duration-300 group-hover:text-text-primary">{ICONS[link.platform] || ICONS.Instagram}</div>
              <div className="flex flex-col items-start text-left"><span className="text-[0.7rem] font-bold uppercase tracking-widest text-text-primary">{link.platform}</span></div>
            </a>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={containerRef} className="relative z-20 mx-auto w-full max-w-[800px] bg-transparent px-6 py-32 text-center">
      <div className="mb-20">
        <h2 className="font-serif text-3xl font-normal italic text-text-primary drop-shadow-sm sm:text-4xl">Follow the branches of my visual world.</h2>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-relaxed text-text-secondary">Portraits, travel notes, behind-the-scenes moments, and selected updates live across the channels I choose to share.</p>
      </div>

      <div className="relative mx-auto flex flex-col items-center">
        <div className="pointer-events-none absolute inset-y-0 left-[2.2rem] z-0 w-[100px] sm:left-1/2 sm:-ml-[50px]">
          <svg className="h-full w-full text-text-secondary/60 dark:text-text-secondary/40" preserveAspectRatio="none" viewBox="0 0 100 1000">
            <path ref={vineRef} d="M 50 0 C 60 100, 30 200, 50 300 C 70 400, 40 500, 50 600 C 60 700, 30 800, 50 900 C 70 1000, 50 1000, 50 1000" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="drop-shadow-sm" />
            <path d="M 53 150 Q 60 145 65 155 Q 55 160 53 150" fill="currentColor" opacity="0.9" />
            <path d="M 47 350 Q 35 345 35 355 Q 45 365 47 350" fill="currentColor" opacity="0.9" />
            <path d="M 54 550 Q 65 545 65 555 Q 55 565 54 550" fill="currentColor" opacity="0.9" />
            <path d="M 45 750 Q 30 740 30 755 Q 40 765 45 750" fill="currentColor" opacity="0.9" />
          </svg>
        </div>

        <div className="relative z-10 flex w-full flex-col gap-12 py-8 sm:gap-20">
          {displayLinks.map((link, index) => {
            const isLeft = index % 2 === 0;
            return (
              <div key={link.id} className={`relative flex w-full items-center pl-16 sm:pl-0 ${isLeft ? "justify-start sm:-mr-4 sm:justify-end sm:pr-[50%]" : "justify-start sm:-ml-4 sm:pl-[50%]"}`}>
                <svg className={`social-branch pointer-events-none absolute hidden h-10 w-20 text-accent sm:block ${isLeft ? "branch-left right-[calc(50%-1.5rem)]" : "branch-right left-[calc(50%-1.5rem)]"}`} viewBox="0 0 100 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  {isLeft ? (
                    <><path d="M100 25 C 60 25, 40 15, 0 25"/><circle cx="5" cy="25" r="4" fill="currentColor"/><path d="M50 20 Q 40 10 30 15 Q 40 25 50 20" fill="currentColor" opacity="0.7"/></>
                  ) : (
                    <><path d="M0 25 C 40 25, 60 15, 100 25"/><circle cx="95" cy="25" r="4" fill="currentColor"/><path d="M50 20 Q 60 10 70 15 Q 60 25 50 20" fill="currentColor" opacity="0.7"/></>
                  )}
                </svg>

                <svg className="social-branch branch-right pointer-events-none absolute left-8 h-8 w-12 text-accent sm:hidden" viewBox="0 0 50 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M0 15 C 20 15, 30 10, 50 15"/><circle cx="45" cy="15" r="3" fill="currentColor"/>
                </svg>

                <a href={link.url} target="_blank" rel="noreferrer" data-nature-surface="social-card" className={`social-card group relative flex w-full max-w-[280px] items-center gap-4 rounded-[1.2rem] border-2 border-border bg-surface/32 px-5 py-4 text-text-primary shadow-[0_4px_20px_rgb(0,0,0,0.06)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:bg-surface/44 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${isLeft ? "mr-0 sm:mr-10" : "ml-0 sm:ml-10"}`}>
                  <div className="absolute inset-0 -z-10 rounded-[1.2rem] bg-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border/50 bg-surface-secondary/36 text-text-secondary shadow-sm transition-colors duration-300 group-hover:bg-accent group-hover:text-accent-foreground">{ICONS[link.platform] || ICONS.Instagram}</div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-bold uppercase tracking-wider text-text-primary">{link.platform}</span>
                    {link.label ? <span className="mt-0.5 text-xs font-medium text-text-secondary">{link.label}</span> : null}
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

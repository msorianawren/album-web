"use client";

import { useEffect, useRef } from "react";
import type { LandingSocialLink } from "@/lib/types";
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

export function SocialLinksTree({ links }: { links: LandingSocialLink[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vineRef = useRef<SVGPathElement>(null);
  
  const displayLinks = [...links].filter(l => l.enabled).sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (!containerRef.current || displayLinks.length === 0) return;
    
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.social-card');
      const branches = gsap.utils.toArray<SVGElement>('.social-branch');
      
      if (prefersReducedMotion) {
        gsap.set(cards, { opacity: 1, y: 0 });
        gsap.set(branches, { opacity: 0.5, scaleX: 1 });
        if (vineRef.current) {
          gsap.set(vineRef.current, { strokeDasharray: "none", strokeDashoffset: 0 });
        }
        return;
      }

      // Animate vine drawing down
      if (vineRef.current) {
        const length = vineRef.current.getTotalLength() || 1000;
        gsap.fromTo(vineRef.current, 
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 85%",
              end: "bottom 95%",
              scrub: 1,
            }
          }
        );
      }

      gsap.fromTo(cards, 
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        }
      );

      gsap.fromTo(branches, 
        { opacity: 0, scaleX: 0 },
        {
          opacity: 0.5,
          scaleX: 1,
          transformOrigin: (i, el) => el.classList.contains('branch-left') ? "right center" : "left center",
          duration: 0.8,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [displayLinks.length]);

  if (displayLinks.length === 0) return null;

  return (
    <section ref={containerRef} className="relative mx-auto w-full max-w-[800px] px-6 py-32 text-center overflow-hidden">
      <div className="mb-20">
        <h2 className="font-serif text-3xl font-light italic text-text-primary sm:text-4xl">
          Follow the branches of my visual world.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-text-secondary">
          Portraits, travel notes, behind-the-scenes moments, and selected updates live across the channels I choose to share.
        </p>
      </div>

      <div className="relative mx-auto flex flex-col items-center">
        {/* Organic Vine Path */}
        <svg 
          className="absolute left-[1.1rem] sm:left-1/2 top-[-2rem] bottom-[-4rem] w-6 h-[calc(100%+6rem)] -ml-3 sm:-ml-3 z-0 text-border opacity-40" 
          preserveAspectRatio="none" 
          viewBox="0 0 20 100"
        >
          <path
            ref={vineRef}
            d="M 10 0 Q 18 5 10 10 T 10 20 T 10 30 T 10 40 T 10 50 T 10 60 T 10 70 T 10 80 T 10 90 T 10 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        
        <div className="relative z-10 flex w-full flex-col gap-12 sm:gap-16">
          {displayLinks.map((link, idx) => {
            const isLeft = idx % 2 === 0;
            const Icon = ICONS[link.platform] || ICONS.Instagram;
            return (
              <div key={link.id} className={`flex w-full ${isLeft ? "justify-start sm:justify-end sm:pr-[50%] sm:-mr-4" : "justify-start sm:pl-[50%] sm:-ml-4"} items-center relative pl-12 sm:pl-0`}>
                
                {/* Branch SVG */}
                <svg className={`social-branch absolute hidden sm:block w-16 h-8 text-border opacity-50 ${isLeft ? "right-[calc(50%-1rem)] branch-left" : "left-[calc(50%-1rem)] branch-right"}`} viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {isLeft ? (
                    <>
                      <path d="M64 16 Q 32 16 0 8" />
                      <path d="M32 16 Q 28 8 20 8" fill="currentColor" opacity="0.4"/>
                      <circle cx="20" cy="8" r="1.5" fill="currentColor" />
                    </>
                  ) : (
                    <>
                      <path d="M0 16 Q 32 16 64 8" />
                      <path d="M32 16 Q 36 8 44 8" fill="currentColor" opacity="0.4"/>
                      <circle cx="44" cy="8" r="1.5" fill="currentColor" />
                    </>
                  )}
                </svg>

                {/* Mobile Branch */}
                <svg className="social-branch absolute sm:hidden w-8 h-8 left-4 text-border opacity-50 branch-right" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M0 16 Q 16 16 32 8" />
                  <path d="M16 16 Q 20 8 24 8" fill="currentColor" opacity="0.4"/>
                </svg>
                
                <a
                  href={link.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  data-nature-surface="social-card"
                  className={`social-card group relative flex w-full max-w-[260px] items-center gap-4 rounded-[1.6rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 pr-6 text-text-primary shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md transition duration-500 hover:-translate-y-1 hover:border-[var(--preset-accent)] hover:bg-[var(--preset-hover-bg)] hover:shadow-[var(--preset-glow)] ${isLeft ? "sm:mr-8 mr-0" : "sm:ml-8 ml-0"}`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-surface/50 text-text-secondary transition-colors duration-500 group-hover:bg-[var(--preset-accent)] group-hover:text-surface">
                    {Icon}
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-semibold tracking-wide uppercase">{link.platform}</span>
                    {link.label && (
                      <span className="text-xs text-text-secondary opacity-80">{link.label}</span>
                    )}
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

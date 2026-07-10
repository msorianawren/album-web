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
        gsap.set(branches, { opacity: 1, scaleX: 1 });
        if (vineRef.current) {
          gsap.set(vineRef.current, { strokeDasharray: "none", strokeDashoffset: 0 });
        }
        return;
      }

      // Animate vine drawing down
      if (vineRef.current) {
        const length = vineRef.current.getTotalLength() || 2000;
        gsap.fromTo(vineRef.current, 
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 80%",
              end: "bottom 90%",
              scrub: 0.5,
            }
          }
        );
      }

      gsap.fromTo(cards, 
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
            toggleActions: "play none none none"
          }
        }
      );

      gsap.fromTo(branches, 
        { opacity: 0, scaleX: 0 },
        {
          opacity: 1,
          scaleX: 1,
          transformOrigin: (i, el) => el.classList.contains('branch-left') ? "right center" : "left center",
          duration: 0.6,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
            toggleActions: "play none none none"
          }
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [displayLinks.length]);

  if (displayLinks.length === 0) return null;

  return (
    <section ref={containerRef} className="relative z-20 mx-auto w-full max-w-[800px] px-6 py-32 text-center bg-transparent">
      {/* Remove faded full-section photo overlay and enforce clean solid layout */}
      <div className="mb-20">
        <h2 className="font-serif text-3xl font-normal italic text-text-primary sm:text-4xl drop-shadow-sm">
          Follow the branches of my visual world.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-text-secondary font-medium">
          Portraits, travel notes, behind-the-scenes moments, and selected updates live across the channels I choose to share.
        </p>
      </div>

      <div className="relative mx-auto flex flex-col items-center">
        {/* Organic Vine Path Container */}
        <div className="absolute inset-y-0 left-[2.2rem] w-[100px] sm:left-1/2 sm:-ml-[50px] z-0 pointer-events-none">
          {/* Main Trunk SVG */}
          <svg 
            className="h-full w-full text-accent" 
            preserveAspectRatio="none" 
            viewBox="0 0 100 1000"
          >
            <path
              ref={vineRef}
              d="M 50 0 C 60 100, 30 200, 50 300 C 70 400, 40 500, 50 600 C 60 700, 30 800, 50 900 C 70 1000, 50 1000, 50 1000"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="drop-shadow-sm"
            />
            {/* Small leaves along the trunk */}
            <path d="M 53 150 Q 60 145 65 155 Q 55 160 53 150" fill="currentColor" opacity="0.8" />
            <path d="M 47 350 Q 35 345 35 355 Q 45 365 47 350" fill="currentColor" opacity="0.8" />
            <path d="M 54 550 Q 65 545 65 555 Q 55 565 54 550" fill="currentColor" opacity="0.8" />
            <path d="M 45 750 Q 30 740 30 755 Q 40 765 45 750" fill="currentColor" opacity="0.8" />
          </svg>
        </div>
        
        <div className="relative z-10 flex w-full flex-col gap-12 sm:gap-20 py-8">
          {displayLinks.map((link, idx) => {
            const isLeft = idx % 2 === 0;
            const Icon = ICONS[link.platform] || ICONS.Instagram;
            
            return (
              <div key={link.id} className={`flex w-full ${isLeft ? "justify-start sm:justify-end sm:pr-[50%] sm:-mr-4" : "justify-start sm:pl-[50%] sm:-ml-4"} items-center relative pl-16 sm:pl-0`}>
                
                {/* Branch Connector (Desktop) */}
                <svg className={`social-branch pointer-events-none absolute hidden sm:block w-20 h-10 text-accent ${isLeft ? "right-[calc(50%-1.5rem)] branch-left" : "left-[calc(50%-1.5rem)] branch-right"}`} viewBox="0 0 100 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  {isLeft ? (
                    <>
                      <path d="M100 25 C 60 25, 40 15, 0 25" />
                      <circle cx="5" cy="25" r="4" fill="currentColor" />
                      <path d="M50 20 Q 40 10 30 15 Q 40 25 50 20" fill="currentColor" opacity="0.7" />
                    </>
                  ) : (
                    <>
                      <path d="M0 25 C 40 25, 60 15, 100 25" />
                      <circle cx="95" cy="25" r="4" fill="currentColor" />
                      <path d="M50 20 Q 60 10 70 15 Q 60 25 50 20" fill="currentColor" opacity="0.7" />
                    </>
                  )}
                </svg>

                {/* Branch Connector (Mobile) */}
                <svg className="social-branch pointer-events-none absolute sm:hidden w-12 h-8 left-8 text-accent branch-right" viewBox="0 0 50 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M0 15 C 20 15, 30 10, 50 15" />
                  <circle cx="45" cy="15" r="3" fill="currentColor" />
                </svg>
                
                <a
                  href={link.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  data-nature-surface="social-card"
                  className={`social-card group relative flex w-full max-w-[280px] items-center gap-4 rounded-[1.2rem] border-2 border-border bg-surface px-5 py-4 text-text-primary shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${isLeft ? "sm:mr-10 mr-0" : "sm:ml-10 ml-0"}`}
                >
                  {/* Subtle hover glow tied to card */}
                  <div className="absolute inset-0 -z-10 rounded-[1.2rem] bg-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-text-secondary transition-colors duration-300 group-hover:bg-accent group-hover:text-accent-foreground shadow-sm border border-border/50">
                    {Icon}
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-bold tracking-wider uppercase text-text-primary">{link.platform}</span>
                    {link.label && (
                      <span className="text-xs font-medium text-text-secondary mt-0.5">{link.label}</span>
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

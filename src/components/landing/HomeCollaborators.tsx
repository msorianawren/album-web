"use client";

import { useEffect, useRef } from "react";
import type { CollaboratorProfile } from "@/lib/types";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function HomeCollaborators({ collaborators }: { collaborators: CollaboratorProfile[] }) {
  const containerRef = useRef<HTMLElement>(null);
  const displayCollaborators = [...collaborators].filter(c => c.enabled).sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (!containerRef.current || displayCollaborators.length === 0) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.collab-card');
      
      if (prefersReducedMotion) {
        gsap.set(cards, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(cards, 
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
            toggleActions: "play none none none"
          }
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [displayCollaborators.length]);

  if (displayCollaborators.length === 0) return null;

  return (
    <section ref={containerRef} className="mx-auto w-full max-w-[1200px] px-6 py-24 sm:py-32">
      <div className="mb-20 flex flex-col items-center text-center">
        <span className="text-[0.65rem] uppercase tracking-[0.25em] text-text-secondary mb-4">The Collective</span>
        <h2 className="font-serif text-4xl font-normal text-text-primary sm:text-5xl lg:text-[4rem] leading-none">
          Creative Partners
        </h2>
        <p className="mx-auto mt-6 max-w-[480px] text-[0.95rem] leading-[1.8] text-text-secondary font-light">
          Visionaries and artisans who collaborate to shape the quiet luxury of these visual narratives.
        </p>
      </div>

      <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
        {displayCollaborators.map((collab) => (
          <div key={collab.id} className="collab-card group flex flex-col items-center text-center">
            <div className="relative mb-8 w-full max-w-[280px] aspect-[3/4] overflow-hidden bg-surface-secondary shadow-lg">
              {collab.portrait_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={collab.portrait_url}
                  alt={collab.name}
                  className="h-full w-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-surface text-4xl font-serif text-text-secondary/30">
                  {collab.name.charAt(0)}
                </div>
              )}
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-background/0 transition-colors duration-500 group-hover:bg-background/20" />
              
              {collab.portfolio_url && (
                <a
                  href={collab.portfolio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 translate-y-8 opacity-0 flex h-12 w-12 items-center justify-center rounded-full bg-background/90 text-text-primary backdrop-blur-sm shadow-md transition-all duration-500 hover:bg-text-primary hover:text-background group-hover:translate-y-0 group-hover:opacity-100"
                  aria-label={`View ${collab.name}'s portfolio`}
                >
                  <ArrowUpRight className="h-5 w-5" />
                </a>
              )}
            </div>
            
            <h3 className="font-serif text-2xl text-text-primary">{collab.name}</h3>
            <span className="mt-2 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-text-secondary">
              {collab.role}
            </span>
            {collab.bio && (
              <p className="mt-5 max-w-[300px] text-[0.9rem] leading-[1.6] text-text-secondary font-light">
                {collab.bio}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

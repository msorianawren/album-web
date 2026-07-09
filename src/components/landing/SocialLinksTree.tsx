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
  
  const displayLinks = [...links].filter(l => l.enabled).sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.social-card');
      
      gsap.from(cards, {
        opacity: 0,
        y: 20,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        }
      });
      
      cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
          gsap.to(card, { scale: 1.02, duration: 0.4, ease: "power2.out" });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, { scale: 1, duration: 0.4, ease: "power2.out" });
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, [displayLinks.length]);

  if (displayLinks.length === 0) return null;

  return (
    <section ref={containerRef} className="relative mx-auto w-full max-w-[800px] px-6 py-32 text-center overflow-hidden">
      <div className="mb-16">
        <h2 className="font-serif text-3xl font-light italic text-text-primary sm:text-4xl">
          Follow the branches of my visual world.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-text-secondary">
          Portraits, travel notes, behind-the-scenes moments, and selected updates live across the channels I choose to share.
        </p>
      </div>

      <div className="relative mx-auto flex flex-col items-center">
        <div className="absolute bottom-0 top-0 w-[1px] bg-gradient-to-b from-transparent via-border to-transparent" />
        
        <div className="relative z-10 flex w-full flex-col gap-12 sm:gap-16">
          {displayLinks.map((link, idx) => {
            const isLeft = idx % 2 === 0;
            const Icon = ICONS[link.platform] || ICONS.Instagram;
            return (
              <div key={link.id} className={`flex w-full ${isLeft ? "justify-start sm:justify-end sm:pr-[50%] sm:-mr-4" : "justify-end sm:justify-start sm:pl-[50%] sm:-ml-4"} items-center`}>
                
                <div className={`hidden sm:block h-[1px] w-12 bg-border opacity-50 ${isLeft ? "order-2" : "order-1"}`} />
                
                <a
                  href={link.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={`social-card group relative flex w-full max-w-[240px] items-center gap-4 rounded-[1.4rem] border border-border/50 bg-surface/40 p-3 pr-6 text-text-primary backdrop-blur-md transition-colors hover:border-text-primary/30 hover:bg-surface/80 ${isLeft ? "order-1 sm:mr-0 mr-auto" : "order-2 sm:ml-0 ml-auto"}`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/60 text-text-secondary group-hover:text-text-primary transition-colors">
                    {Icon}
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium tracking-wide uppercase">{link.platform}</span>
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

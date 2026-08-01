"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { LandingSocialLink } from "@/lib/types";

const ICONS: Record<string, React.ReactNode> = {
  Instagram: <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>,
  Facebook: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3"/></svg>,
  Threads: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10c0 4-2.5 7-6.2 7-1.2 0-1.8-.6-1.8-1.8V12a3.5 3.5 0 1 0-4.5 3.3"/></svg>,
  TikTok: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>,
  Telegram: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>,
};

function makeTrunk(count: number) {
  const points = Array.from({ length: count + 1 }, (_, index) => ({
    x: index % 2 === 0 ? 510 : 535,
    y: 28 + index * 180,
  }));
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const middleY = (previous.y + point.y) / 2;
    const bend = index % 2 === 0 ? 26 : -26;
    return `${path} C ${previous.x + bend} ${middleY - 34}, ${point.x - bend} ${middleY + 34}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

export function SocialLinksTree({ links }: { links: LandingSocialLink[] }) {
  const containerRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const displayLinks = useMemo(() => [...links].filter((link) => link.enabled && link.url.trim()).sort((a, b) => a.order - b.order), [links]);
  const treeHeight = Math.max(580, displayLinks.length * 180 + 60);
  const trunkPath = makeTrunk(displayLinks.length);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || displayLinks.length === 0) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      const stems = gsap.utils.toArray<SVGPathElement>(".lcb-tree__stem");
      const branches = gsap.utils.toArray<SVGPathElement>(".lcb-tree__branch-path");
      const leaves = gsap.utils.toArray<SVGElement>(".lcb-tree__leaves, .lcb-tree__node");
      const cards = gsap.utils.toArray<HTMLElement>(".lcb-tree-card");
      const preparePath = (path: SVGPathElement) => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: reduced ? 0 : length });
      };
      [...stems, ...branches].forEach(preparePath);

      if (reduced) {
        gsap.set(leaves, { opacity: 1 });
        gsap.set(cards, { opacity: 1, y: 0 });
        return;
      }

      const timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: { trigger: container, start: "top 78%", once: true },
      });
      timeline
        .to(stems, { strokeDashoffset: 0, duration: 0.7, stagger: 0.05 })
        .to(branches, { strokeDashoffset: 0, duration: 0.45, stagger: 0.055 }, "-=0.28")
        .fromTo(leaves, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.02 }, "-=0.24")
        .fromTo(cards, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.055 }, "-=0.24");
    }, container);
    return () => context.revert();
  }, [displayLinks.length]);

  if (displayLinks.length === 0) return null;

  return (
    <section ref={containerRef} className="lcb-social" aria-labelledby="social-tree-heading">
      <header>
        <p className="lcb-kicker">Elsewhere</p>
        <h2 id="social-tree-heading">Follow the branches of my visual world.</h2>
        <p>Portraits, travel notes, behind-the-scenes moments, and selected updates live across the channels I choose to share.</p>
      </header>

      <div className="lcb-tree" style={{ height: `${treeHeight}px` }}>
        <svg className="lcb-tree__desktop" viewBox={`0 0 1000 ${treeHeight}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="lcb-tree__stem" d={trunkPath} />
          {displayLinks.length > 2 ? <path className="lcb-tree__stem lcb-tree__secondary" d={`M 520 320 C 452 390, 463 500, 404 ${treeHeight - 96}`} /> : null}
          {displayLinks.map((link, index) => {
            const y = 118 + index * 180;
            const isLeft = index % 2 === 0;
            const startX = index % 2 === 0 ? 520 : 525;
            const endX = isLeft ? 326 : 684;
            const controlX = isLeft ? 438 - index * 4 : 603 + index * 3;
            const active = activeId === link.id;
            return (
              <g key={link.id} className="lcb-tree__branch" data-active={active}>
                <path className="lcb-tree__branch-path" d={`M ${startX} ${y - 22} C ${controlX} ${y - 54}, ${isLeft ? endX + 48 : endX - 48} ${y + 8}, ${endX} ${y}`} />
                <circle className="lcb-tree__node" cx={endX} cy={y} r="4" />
                <g className="lcb-tree__leaves" transform={`translate(${isLeft ? endX + 64 : endX - 70} ${y - 18}) ${isLeft ? "" : "scale(-1 1)"}`}>
                  <path d="M0 15 C8 0 22 1 27 8 C18 17 8 20 0 15Z" />
                  <path d="M18 19 C30 10 43 15 45 23 C34 28 24 27 18 19Z" />
                </g>
              </g>
            );
          })}
        </svg>

        <svg className="lcb-tree__mobile" viewBox={`0 0 120 ${treeHeight}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="lcb-tree__stem" d={`M 34 22 C 58 ${treeHeight * 0.27}, 17 ${treeHeight * 0.64}, 40 ${treeHeight - 24}`} />
          {displayLinks.map((link, index) => {
            const y = 118 + index * 180;
            const active = activeId === link.id;
            return (
              <g key={link.id} className="lcb-tree__branch" data-active={active}>
                <path className="lcb-tree__branch-path" d={`M 36 ${y - 20} C 58 ${y - 34}, 74 ${y}, 112 ${y}`} />
                <circle className="lcb-tree__node" cx="112" cy={y} r="3.5" />
                <g className="lcb-tree__leaves" transform={`translate(45 ${y - 34})`}><path d="M0 12 C8 0 20 2 23 8 C16 15 7 17 0 12Z" /></g>
              </g>
            );
          })}
        </svg>

        <div className="lcb-tree__cards">
          {displayLinks.map((link, index) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="lcb-tree-card"
              data-side={index % 2 === 0 ? "left" : "right"}
              onMouseEnter={() => setActiveId(link.id)}
              onMouseLeave={() => setActiveId(null)}
              onFocus={() => setActiveId(link.id)}
              onBlur={() => setActiveId(null)}
            >
              <span className="lcb-tree-card__icon">{ICONS[link.platform] || ICONS.Instagram}</span>
              <span>
                <strong>{link.platform}</strong>
                {link.label ? <small>{link.label}</small> : null}
              </span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export function LiveFeatherBadge({ initialBalance = 0, tooltipText }: { initialBalance?: number | null, tooltipText: string }) {
  const [balance, setBalance] = useState(initialBalance ?? 0);
  const [animate, setAnimate] = useState(false);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const [deductAnimate, setDeductAnimate] = useState(false);
  const [lastDeduction, setLastDeduction] = useState<number | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ rewardGranted?: number; deduction?: number; balanceAfter: number }>;
      const { rewardGranted = 0, deduction = 0, balanceAfter } = customEvent.detail;
      
      setBalance(balanceAfter);
      
      if (rewardGranted > 0) {
        setLastReward(rewardGranted);
        setAnimate(true);
        setTimeout(() => setAnimate(false), 2200);
        
        if (badgeRef.current) {
          const rect = badgeRef.current.getBoundingClientRect();
          const x = (rect.left + rect.width / 2) / window.innerWidth;
          const y = (rect.top + rect.height / 2) / window.innerHeight;
          
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { x, y },
            colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
            disableForReducedMotion: true,
            zIndex: 100
          });
        }
      } else if (deduction > 0 || rewardGranted < 0) {
        const spent = deduction > 0 ? deduction : Math.abs(rewardGranted);
        setLastDeduction(spent);
        setDeductAnimate(true);
        setTimeout(() => setDeductAnimate(false), 2200);
      }
    };

    window.addEventListener("wren-feathers-update", handleUpdate);
    return () => window.removeEventListener("wren-feathers-update", handleUpdate);
  }, []);

  return (
    <div className="group relative flex items-center shrink-0 cursor-help" ref={badgeRef}>
      <div 
        className={`flex h-9 sm:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 sm:px-4 text-xs sm:text-sm font-semibold tracking-wide shadow-sm backdrop-blur-md transition-all duration-500
          ${animate ? "scale-105 sm:scale-110 border-accent/60 bg-accent/10 text-accent shadow-accent/20" : ""}
          ${deductAnimate ? "scale-105 sm:scale-110 border-rose-500/60 bg-rose-500/10 text-rose-500 shadow-rose-500/20" : "text-text-primary hover:bg-surface/70"}
        `}
      >
        <Sparkles className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${animate ? "text-accent animate-pulse" : deductAnimate ? "text-rose-500 animate-pulse" : "text-muted-accent"}`} />
        <span className="tabular-nums">{balance}</span>
      </div>
      
      {/* Floating +X animation */}
      {animate && lastReward !== null && (
        <div className="pointer-events-none absolute -top-5 sm:-top-6 right-2 animate-bounce text-sm font-bold text-accent drop-shadow-md z-50">
          +{lastReward}
        </div>
      )}

      {/* Floating -X deduction animation */}
      {deductAnimate && lastDeduction !== null && (
        <div className="pointer-events-none absolute -top-5 sm:-top-6 right-2 animate-bounce text-sm font-bold text-rose-500 drop-shadow-md z-50">
          -{lastDeduction}
        </div>
      )}
      
      {/* Tooltip Popup */}
      <div className="pointer-events-none absolute right-0 top-[110%] z-50 w-64 origin-top-right scale-95 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
        <div className="rounded-[1rem] border border-border bg-surface/95 p-4 text-sm leading-5 shadow-2xl backdrop-blur-xl">
          <p className="font-semibold text-text-primary mb-1 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Wren Feathers
          </p>
          <p className="text-text-secondary text-xs">
            {tooltipText}
          </p>
        </div>
      </div>
    </div>
  );
}

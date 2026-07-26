"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export function LiveFeatherBadge({ initialBalance = 0 }: { initialBalance?: number | null }) {
  const [balance, setBalance] = useState(initialBalance ?? 0);
  const [animate, setAnimate] = useState(false);
  const [lastReward, setLastReward] = useState<number | null>(null);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ rewardGranted: number; balanceAfter: number }>;
      const { rewardGranted, balanceAfter } = customEvent.detail;
      
      setBalance(balanceAfter);
      
      if (rewardGranted > 0) {
        setLastReward(rewardGranted);
        setAnimate(true);
        setTimeout(() => setAnimate(false), 2000); // Reset animation state
      }
    };

    window.addEventListener("wren-feathers-update", handleUpdate);
    return () => window.removeEventListener("wren-feathers-update", handleUpdate);
  }, []);

  return (
    <div className="relative flex items-center shrink-0">
      <div 
        className={`flex h-9 sm:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 sm:px-4 text-xs sm:text-sm font-semibold tracking-wide shadow-sm backdrop-blur-md transition-all duration-500
          ${animate ? "scale-105 sm:scale-110 border-accent/60 bg-accent/10 text-accent shadow-accent/20" : "text-text-primary hover:bg-surface/70"}
        `}
      >
        <Sparkles className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${animate ? "text-accent animate-pulse" : "text-muted-accent"}`} />
        <span className="tabular-nums">{balance}</span>
      </div>
      
      {/* Floating +X animation */}
      {animate && lastReward !== null && (
        <div className="pointer-events-none absolute -top-5 sm:-top-6 right-2 animate-bounce text-sm font-bold text-accent drop-shadow-md">
          +{lastReward}
        </div>
      )}
    </div>
  );
}

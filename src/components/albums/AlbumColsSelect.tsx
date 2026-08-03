"use client";

import { LayoutGrid, Minus, Plus } from "lucide-react";

interface AlbumColsSelectProps {
  value?: number;
  defaultValue?: number;
  onChange?: (cols: number) => void;
}

export function AlbumColsSelect({ value, defaultValue = 5, onChange }: AlbumColsSelectProps) {
  const currentValue = value ?? defaultValue;

  const handleDecrease = () => {
    if (currentValue > 2) {
      onChange?.(currentValue - 1);
    }
  };

  const handleIncrease = () => {
    if (currentValue < 10) {
      onChange?.(currentValue + 1);
    }
  };

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border/50 bg-surface/75 backdrop-blur-md shadow-sm select-none">
      <button
        type="button"
        onClick={handleDecrease}
        disabled={currentValue <= 2}
        className="h-7 w-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-secondary/70 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        aria-label="Decrease columns"
      >
        <Minus className="h-3 w-3" />
      </button>

      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-text-primary tracking-wide">
        <LayoutGrid className="h-3.5 w-3.5 text-accent opacity-80" />
        <span>{currentValue} cols</span>
      </div>

      <button
        type="button"
        onClick={handleIncrease}
        disabled={currentValue >= 10}
        className="h-7 w-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-secondary/70 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        aria-label="Increase columns"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

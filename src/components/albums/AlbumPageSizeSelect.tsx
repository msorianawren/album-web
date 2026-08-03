"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";

const batchSizes = [12, 24, 48, 96];

export function AlbumPageSizeSelect({ defaultValue = 24 }: { defaultValue: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const changePageSize = (limit: number) => {
    if (limit === defaultValue) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", String(limit));
    params.delete("page");
    startTransition(() => {
      router.push(`/albums?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border/50 bg-surface/75 backdrop-blur-md shadow-sm select-none">
      <div className="flex items-center gap-1 pl-2 pr-1 text-xs font-semibold text-text-secondary" title="Albums per batch">
        <Layers className="h-3.5 w-3.5 text-accent opacity-80" />
      </div>
      {batchSizes.map((size) => {
        const isSelected = size === defaultValue;
        return (
          <button
            key={size}
            type="button"
            onClick={() => changePageSize(size)}
            className={`
              h-7 px-2.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer
              ${
                isSelected
                  ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary/60"
              }
            `}
          >
            {size}
          </button>
        );
      })}
    </div>
  );
}

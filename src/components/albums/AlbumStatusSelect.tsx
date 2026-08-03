"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe, Clock, Lock, Sparkles } from "lucide-react";
import type { AppDictionary } from "@/lib/i18n";

interface AlbumStatusSelectProps {
  currentStatus?: string;
  dict?: AppDictionary;
}

export function AlbumStatusSelect({ currentStatus = "", dict }: AlbumStatusSelectProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const options = [
    {
      value: "",
      label: dict?.albums?.all_statuses || "All Collections",
      icon: Sparkles,
    },
    {
      value: "public",
      label: dict?.albums?.status_public || "Public",
      icon: Globe,
    },
    {
      value: "updating",
      label: dict?.albums?.status_updating || "Updating",
      icon: Clock,
    },
    {
      value: "private",
      label: dict?.albums?.status_private || "Private",
      icon: Lock,
    },
  ];

  const handleSelect = (value: string) => {
    if (value === currentStatus) return;

    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.delete("page");

    startTransition(() => {
      router.push(`/albums?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full border border-border/50 bg-surface/75 backdrop-blur-md shadow-sm select-none">
      {options.map((option) => {
        const isSelected = option.value === currentStatus;
        const ItemIcon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`
              h-7.5 px-3 rounded-full text-xs font-medium transition-all duration-200
              flex items-center gap-1.5 cursor-pointer
              ${
                isSelected
                  ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary/60"
              }
            `}
          >
            <ItemIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

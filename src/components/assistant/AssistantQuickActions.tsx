"use client";

import type { AssistantQuickAction } from "@/lib/assistant/knowledge";
import { cn } from "@/lib/utils";

interface AssistantQuickActionsProps {
  actions: AssistantQuickAction[];
  onSelect: (action: AssistantQuickAction) => void;
  compact?: boolean;
}

export function AssistantQuickActions({
  actions,
  onSelect,
  compact = false,
}: AssistantQuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={`${action.id}-${action.label}`}
          type="button"
          onClick={() => onSelect(action)}
          className={cn(
            "rounded-full border border-border bg-surface/80 text-text-primary transition hover:border-accent hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact
              ? "px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]"
              : "px-4 py-2 text-xs font-semibold",
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

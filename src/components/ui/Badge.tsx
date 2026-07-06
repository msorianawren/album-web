import type { AlbumStatus } from "@/lib/types";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AlbumStatusBadge({ status }: { status: AlbumStatus }) {
  const label =
    status === "public" ? "Welcome" : status === "updating" ? "Updating" : "Private";

  return (
    <Badge
      className={cn(
        status === "public" && "bg-accent text-accent-foreground",
        status === "updating" && "border-accent text-accent",
      )}
    >
      {label}
    </Badge>
  );
}

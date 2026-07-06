import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-surface-secondary", className)}
      aria-hidden="true"
    />
  );
}

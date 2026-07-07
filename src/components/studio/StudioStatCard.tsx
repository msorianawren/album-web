import type { ReactNode } from "react";

interface StudioStatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

export function StudioStatCard({ label, value, hint }: StudioStatCardProps) {
  return (
    <article className="rounded-[1.3rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-text-primary">{value}</p>
      {hint ? <p className="mt-2 text-xs text-text-secondary">{hint}</p> : null}
    </article>
  );
}

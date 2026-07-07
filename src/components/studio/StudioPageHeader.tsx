import type { ReactNode } from "react";

interface StudioPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function StudioPageHeader({ eyebrow, title, description, actions }: StudioPageHeaderProps) {
  return (
    <section className="rounded-[1.6rem] border border-border bg-surface/88 p-5 shadow-xl shadow-text-primary/5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl font-semibold text-text-primary">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

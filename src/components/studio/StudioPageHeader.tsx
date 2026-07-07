import type { ReactNode } from "react";

interface StudioPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function StudioPageHeader({ eyebrow, title, description, actions }: StudioPageHeaderProps) {
  return (
    <section className="rounded-[1.25rem] border border-border bg-surface/88 p-4 shadow-xl shadow-text-primary/5 sm:rounded-[1.6rem] sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 break-words text-2xl font-semibold text-text-primary sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div> : null}
      </div>
    </section>
  );
}

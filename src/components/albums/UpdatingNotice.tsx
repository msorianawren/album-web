import { RefreshCw } from "lucide-react";

export function UpdatingNotice() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-8 lg:px-12">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-text-secondary">
        <RefreshCw className="h-5 w-5 text-accent" aria-hidden="true" />
        <p>This album is currently being updated.</p>
      </div>
    </section>
  );
}

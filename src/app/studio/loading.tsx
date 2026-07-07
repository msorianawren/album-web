export default function StudioLoading() {
  return (
    <div className="grid gap-5">
      <div className="h-36 animate-pulse rounded-[1.6rem] border border-border bg-surface/70" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[1.3rem] border border-border bg-surface/60"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-[1.6rem] border border-border bg-surface/60" />
    </div>
  );
}

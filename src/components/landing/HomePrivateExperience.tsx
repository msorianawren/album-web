export function HomePrivateExperience() {
  return (
    <section className="mx-auto w-full max-w-[900px] px-6 py-24 sm:py-32">
      <div className="rounded-[2rem] border border-border bg-surface-secondary/40 p-8 sm:p-16 backdrop-blur-sm">
        <h2 className="font-serif text-2xl font-light text-text-primary sm:text-3xl">
          The Album Experience
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-text-primary">
              Public & Updating
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Selected portfolios and travel diaries are open to all visitors. Some collections are continually updated over time as new moments are captured.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-text-primary">
              Private Archives
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Exclusive client work and personal collections are protected. You may request access to view these albums by signing in with your Google account.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

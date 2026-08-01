import type { LandingPageContent } from "@/lib/types";

export function HomeEditorialIntro({ landing }: { landing: LandingPageContent }) {
  if (!landing.body.trim()) return null;

  return (
    <section className="lcb-intro" aria-label="Introduction">
      <div className="lcb-intro__mark" aria-hidden="true">O / W</div>
      <p>{landing.body}</p>
    </section>
  );
}

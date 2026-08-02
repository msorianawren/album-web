import type { LandingPageContent } from "@/lib/types";
import { SakuraCorner, SakuraCrest } from "./NatureOrnament";

export function HomeEditorialIntro({ landing }: { landing: LandingPageContent }) {
  if (!landing.body.trim()) return null;

  return (
    <section className="lcb-intro relative overflow-hidden" aria-label="Introduction">
      <SakuraCorner position="top-right" className="opacity-90" />
      <div className="lcb-intro__mark flex items-center gap-2" aria-hidden="true">
        <span>O / W</span>
        <SakuraCrest className="h-3.5 w-3.5 opacity-80" />
      </div>
      <p>{landing.body}</p>
    </section>
  );
}

import { ArrowUpRight } from "lucide-react";
import type { CollaboratorProfile } from "@/lib/types";
import { SakuraCorner, SakuraCrest } from "./NatureOrnament";

export function HomeCollaborators({ collaborators }: { collaborators: CollaboratorProfile[] }) {
  const displayCollaborators = [...collaborators]
    .filter((collaborator) => collaborator.enabled && (collaborator.name.trim() || collaborator.role.trim() || collaborator.portrait_url?.trim()))
    .sort((a, b) => a.order - b.order)
    .slice(0, 3);

  if (displayCollaborators.length === 0) return null;

  return (
    <section className="lcb-collaborators relative overflow-hidden" aria-labelledby="creative-partners-heading" data-count={displayCollaborators.length}>
      <SakuraCorner position="top-right" />
      <div className="lcb-section-heading">
        <p className="flex items-center gap-2">
          <span>Credits</span>
          <SakuraCrest className="h-3 w-3 opacity-75" />
        </p>
        <h2 id="creative-partners-heading">Creative Partners</h2>
      </div>

      <div className="lcb-collaborators__sheet">
        {displayCollaborators.map((collaborator, index) => (
          <article key={collaborator.id} data-position={index + 1}>
            {collaborator.portrait_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={collaborator.portrait_url} alt={collaborator.name} loading="lazy" />
            ) : null}
            <div className="lcb-collaborators__credit">
              <div>
                <h3>{collaborator.name}</h3>
                <p>{collaborator.role}</p>
              </div>
              {collaborator.portfolio_url ? (
                <a href={collaborator.portfolio_url} target="_blank" rel="noreferrer">Portfolio <ArrowUpRight aria-hidden="true" /></a>
              ) : null}
            </div>
            {collaborator.bio ? <p className="lcb-collaborators__bio">{collaborator.bio}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

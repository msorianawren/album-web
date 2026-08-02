import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { SakuraCorner, SakuraCrest } from "./NatureOrnament";

const services = [
  { title: "Editorial Modeling", description: "Collaborating on high-fashion and conceptual editorials." },
  { title: "Beauty Direction", description: "Crafting distinct visual identities through makeup and styling." },
  { title: "Campaign Concepts", description: "Translating brand narratives into cinematic photography." },
  { title: "Visual Storytelling", description: "Private commissions and intimate portrait sessions." },
];

export function HomeCreativeServices() {
  return (
    <section className="lcb-services relative overflow-hidden" aria-labelledby="creative-services-heading">
      <SakuraCorner position="top-right" />
      <div className="lcb-services__intro">
        <p className="lcb-kicker flex items-center gap-2">
          <span>Services</span>
          <SakuraCrest className="h-3 w-3 opacity-75" />
        </p>
        <h2 id="creative-services-heading">Creative Collaborations</h2>
        <p>A selective approach to creative partnerships, visual narratives, and nature-led aesthetics.</p>
        <Link href="/about" prefetch={false} className="lcb-text-link">About the Studio</Link>
      </div>

      <div className="lcb-services__index">
        {services.map((service) => (
          <div key={service.title}>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <ArrowUpRight aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}

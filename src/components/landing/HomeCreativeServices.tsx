import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const services = [
  { title: "Editorial Modeling", description: "Collaborating on high-fashion and conceptual editorials." },
  { title: "Beauty Direction", description: "Crafting distinct visual identities through makeup and styling." },
  { title: "Campaign Concepts", description: "Translating brand narratives into cinematic photography." },
  { title: "Visual Storytelling", description: "Private commissions and intimate portrait sessions." },
];

export function HomeCreativeServices() {
  return (
    <section className="lcb-services" aria-labelledby="creative-services-heading">
      <div className="lcb-services__intro">
        <p className="lcb-kicker">Services</p>
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

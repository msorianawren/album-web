import Image from "next/image";
import Link from "next/link";
import type { LandingPageContent } from "@/lib/types";
import type { AppDictionary } from "@/lib/i18n";

interface HomeHeroProps {
  landing: LandingPageContent;
  locale?: string;
  dict?: AppDictionary;
}

export function HomeHero({ landing, locale = "en" }: HomeHeroProps) {
  const translation = landing.translations?.[locale] || {};
  const headline = translation.headline || landing.headline;
  const eyebrow = translation.eyebrow || landing.eyebrow;
  const subheadline = translation.subheadline || landing.subheadline;
  const primaryLabel = translation.primary_cta_label || landing.primary_cta_label;
  const secondaryLabel = translation.secondary_cta_label || landing.secondary_cta_label;
  const primaryHref = landing.primary_cta_href === "#albums" ? "/albums" : landing.primary_cta_href;
  const secondaryHref = landing.secondary_cta_href === "#albums" ? "/albums" : landing.secondary_cta_href;

  return (
    <section className="lcb-hero" aria-labelledby="home-hero-heading">
      <div className="lcb-hero__grid">
        <p className="lcb-hero__eyebrow">{eyebrow}</p>

        <figure className="lcb-hero__dominant">
          <Image
            src={landing.hero_image_url}
            alt="Oriana Wren in an editorial setting"
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 767px) 100vw, 66vw"
          />
        </figure>

        <div className="lcb-hero__copy">
          <h1 id="home-hero-heading">{headline}</h1>
          <p>{subheadline}</p>
          <div className="lcb-hero__actions">
            <Link href={primaryHref} prefetch={false}>{primaryLabel}</Link>
            <Link href={secondaryHref} prefetch={false}>{secondaryLabel}</Link>
          </div>
        </div>

        <figure className="lcb-hero__support">
          <Image
            src={landing.portrait_image_url}
            alt="Editorial portrait of Oriana Wren"
            fill
            sizes="(max-width: 767px) 78vw, 28vw"
          />
        </figure>
      </div>
    </section>
  );
}

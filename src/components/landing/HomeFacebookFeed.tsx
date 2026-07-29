import { ExternalLink } from "lucide-react";
import type { LandingFacebookFeedSettings } from "@/lib/types";
import type { FacebookFeedItem } from "@/lib/facebook-feed/types";
import { FacebookVideoPlayer } from "@/components/landing/FacebookVideoPlayer";

function formatDate(value: string | null) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date); }
function ratio(item: FacebookFeedItem) { if (item.width && item.height && item.width / item.height > 0.35 && item.width / item.height < 3) return item.width / item.height; const declared = item.aspect_ratio?.split(":").map(Number); return declared && declared.length === 2 && declared[0] > 0 && declared[1] > 0 ? declared[0] / declared[1] : 16 / 9; }
function VideoCard({ item, settings, featured = false }: { item: FacebookFeedItem; settings: LandingFacebookFeedSettings; featured?: boolean }) {
  const override = settings.itemOverrides?.[item.id]; if (override?.enabled === false) return null;
  const title = override?.title || item.title || "Facebook video"; const caption = override?.caption || item.caption;
  return <article className={`group min-w-0 ${featured ? "md:row-span-2" : ""}`}><div className="relative overflow-hidden rounded-[1.25rem] bg-surface-secondary shadow-xl shadow-text-primary/5" style={{ aspectRatio: String(ratio(item)) }}>
    <img src={item.poster_url} alt={item.poster_alt || title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03] motion-reduce:transition-none" loading="lazy" />
    <div className="absolute inset-0 bg-gradient-to-t from-text-primary/55 via-transparent to-transparent" /><FacebookVideoPlayer item={item} label={title} />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 text-background sm:p-6"><p className="line-clamp-2 font-serif text-xl leading-tight sm:text-2xl">{title}</p>{settings.showPublishedDate && formatDate(item.published_at) ? <p className="mt-2 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-background/80">{formatDate(item.published_at)}</p> : null}</div>
  </div>{settings.showCaption && caption && caption !== title ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">{caption}</p> : null}</article>;
}
export function HomeFacebookFeed({ settings, items }: { settings: LandingFacebookFeedSettings; items: FacebookFeedItem[] }) {
  const enabledItems = items.filter((item) => settings.itemOverrides?.[item.id]?.enabled !== false).slice(0, settings.maxItems); if (!settings.enabled || !enabledItems.length) return null;
  const featured = enabledItems.find((item) => item.id === settings.featuredItemId) ?? enabledItems[0]; const remaining = enabledItems.filter((item) => item.id !== featured.id);
  return <section aria-labelledby="recent-motion-heading" className="relative mx-auto w-full max-w-[1200px] px-6 py-24 sm:py-32"><div className="mb-10 max-w-2xl sm:mb-14"><p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-text-secondary">{settings.eyebrow}</p><h2 id="recent-motion-heading" className="mt-4 font-serif text-4xl leading-none text-text-primary sm:text-5xl lg:text-[4rem]">{settings.heading}</h2>{settings.description ? <p className="mt-5 max-w-xl text-base leading-7 text-text-secondary">{settings.description}</p> : null}</div>
    {settings.layout === "carousel" ? <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:thin]">{enabledItems.map((item) => <div key={item.id} className="w-[min(82vw,34rem)] shrink-0 snap-start"><VideoCard item={item} settings={settings} featured /></div>)}</div> : settings.layout === "filmstrip" ? <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:thin]">{enabledItems.map((item) => <div key={item.id} className="w-[min(76vw,23rem)] shrink-0 snap-start"><VideoCard item={item} settings={settings} /></div>)}</div> : <div className="grid gap-5 md:grid-cols-5 md:items-start"><div className="md:col-span-3"><VideoCard item={featured} settings={settings} featured /></div><div className="grid gap-5 md:col-span-2">{remaining.map((item) => <VideoCard key={item.id} item={item} settings={settings} />)}</div></div>}
    {settings.showFacebookBranding ? <a href={featured.canonical_url} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-text-secondary transition-colors hover:text-text-primary">From Facebook <ExternalLink className="h-3.5 w-3.5" /></a> : null}
  </section>;
}

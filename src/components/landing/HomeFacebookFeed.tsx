import type { LandingFacebookFeedSettings } from "@/lib/types";
import type { FacebookFeedItem } from "@/lib/facebook-feed/types";
import { FacebookStoryFeed } from "@/components/landing/FacebookStoryFeed";

export function HomeFacebookFeed({ settings, items }: { settings: LandingFacebookFeedSettings; items: FacebookFeedItem[] }) {
  const enabledItems = items.filter((item) => settings.itemOverrides?.[item.id]?.enabled !== false).slice(0, settings.maxItems);
  if (!settings.enabled || !enabledItems.length) return null;

  return <FacebookStoryFeed settings={settings} items={enabledItems} />;
}

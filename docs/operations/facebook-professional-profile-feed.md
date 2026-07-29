# Facebook Professional Profile Feed

The landing page’s Facebook feed is a curated, manual library for public posts, videos, and Reels from Oriana Wren’s Facebook professional profile. It does not use a Facebook Page, Graph API, OAuth, access tokens, a Meta app, webhooks, background sync, or scraping.

## Publishing a new item

1. In Studio → Settings → Landing, open **Facebook Profile Feed**.
2. Add the full public `https://www.facebook.com/...` permalink and upload a poster image to the project’s media storage.
3. Select the content type (or leave it on Auto), then enter optional title, caption, date, and aspect ratio.
4. Save the library item, add it to the landing selection, drag it into order, and mark one item Featured.
5. Save the Landing settings.

The website shows the stored poster first. Pressing Play creates a fixed official Facebook plugin URL from the stored canonical permalink; the website never saves or trusts iframe HTML. Every player also offers **View on Facebook** as the fallback.

## Safety and maintenance

Only exact HTTPS `facebook.com`, `www.facebook.com`, `web.facebook.com`, and `m.facebook.com` permalinks are accepted. The server rejects embed code, non-HTTPS links, credentials, lookalike hosts, local/IP hosts, and `fb.watch` short links. Tracking parameters and URL fragments are removed before storage.

If an item is no longer public or embeddable, leave its poster in place and mark it unavailable. It will disappear from the public feed until it is available again. Deleting an item atomically removes it from the landing selection and clears it as Featured.

## Embed fallback and rollback

The player retains a visible **View on Facebook** link at all times. Browser privacy settings, unavailable content, and Facebook embed policy can prevent an iframe from rendering; after the loading timeout, the player explicitly directs visitors to that link. A Reel uses Facebook's official Embedded Post plugin, while video permalinks use the official Video plugin.

To reverse the database change, review and run `supabase/rollbacks/202607291000_social_embed_items_rollback.sql` through the normal controlled migration workflow. It drops the curated library, the atomic cleanup function, and the `facebook_feed_settings` column. Do not run it automatically: it permanently removes curated feed data without changing other landing columns.

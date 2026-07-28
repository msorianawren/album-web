# Facebook Page Video Feed

The feature is disabled until all server-only values below are configured. The integration pins Graph API version `v25.0` by default; change `META_GRAPH_API_VERSION` only after validating Meta's version lifecycle and the app's approved permissions.

## Meta dashboard checklist

1. Create or select the Meta app, enable Facebook Login, and add `META_OAUTH_REDIRECT_URI` as an exact valid redirect URI.
2. Add the Founder as an app role while the app is in development.
3. Request only `pages_show_list` and `pages_read_engagement`. Advanced Access/App Review may be required before production users outside app roles can connect a Page.
4. Add `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI`, `META_TOKEN_ENCRYPTION_KEY`, and optionally `META_TOKEN_KEY_VERSION` to the deployment's secret store. Generate a new random 32-byte encryption key; do not reuse an app secret as this key.
5. In Studio → Settings → Integrations, connect Facebook, choose a Page, run Sync now, then configure the selection in Landing.
6. Schedule `GET /api/cron/meta-sync` every 15–30 minutes with the existing `Authorization: Bearer <CRON_SECRET>` worker convention.

## Supported content and limits

The feasibility layer normalizes Page `/videos` plus `/video_reels` responses into video, Reel, Live replay, or video-post records. Meta can omit, restrict, or stop embedding some records. The landing keeps its cached poster and source permalink; it does not copy Facebook video files and does not call Graph API during a visitor request.

## Rollback

Disable the section in Landing, stop the scheduler, run `supabase/rollbacks/202607290900_meta_page_video_feed_rollback.sql` through the normal migration workflow, remove the Meta environment variables, then revalidate the landing cache.

# Meta feed implementation note

- The public landing remains cache-first: it reads selected, sanitized video metadata from Supabase and never calls Meta.
- OAuth state is an expiring, hashed database record bound to the Founder account. The short-lived user token used to enumerate Pages is encrypted until a Page is selected, then removed.
- Facebook playback is best-effort: supported Page video, Reel, Live replay, and video-attachment records normalize into one safe internal shape. A permalink remains available when Meta cannot embed an item.
- The integration defaults to disabled until the Meta app and token-vault environment variables are configured.
- Rollback: run `supabase/rollbacks/202607290900_meta_page_video_feed_rollback.sql`, remove the feature environment variables, and revalidate the landing cache.

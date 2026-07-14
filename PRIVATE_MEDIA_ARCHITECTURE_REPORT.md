# Private Media Architecture

## Current inventory

- Media keys live in `media.r2_key`, `thumbnail_r2_key`, `medium_r2_key`, `poster_r2_key`, `public_r2_key`, and `original_private_r2_key`.
- Permanent delivery URLs live in `url`, `thumbnail_url`, `medium_url`, and `poster_url`.
- Image originals already use a `private/albums/...` prefix, but prefixes do not provide privacy when the containing bucket is public.
- Processed image derivatives and videos currently use `albums/...` keys in the public R2 bucket. They are publicly retrievable when their permanent URL or key is known.
- `safe_preview_url` remains the only asset shown for a locked private album and is intentionally outside private media delivery.

## Target design

1. A separate non-public R2 bucket is configured through `R2_PRIVATE_BUCKET_NAME`.
2. `private_media_assets` is the server-only manifest for each media variant and never grants access to `anon` or `authenticated`.
3. Browser payloads use same-site `/api/media/:id/content` URLs and contain no private object-key values or permanent R2 URLs.
4. Every gateway request rechecks the request JWT through media RLS before reading the manifest and streaming R2 content.
5. Responses use `private, no-store`; video byte ranges are passed through.
6. Single downloads and ZIP generation use the same centralized authorization decision.

## Migration gates

- `inventory`: metadata copied only; the source object can still be public.
- `copied`: object copied to the private bucket; source remains untouched.
- `verified`: size/checksum and representative delivery tests pass.
- `active`: gateway reads the private bucket.
- `rollback`: gateway uses the legacy source while investigation continues.

No production object may be deleted or moved during inventory, copy, or verification. Public source cleanup requires a separate, reviewed change after rollback has been exercised.

## Dry-run checks

```sql
select bucket_role, migration_state, count(*)
from public.private_media_assets
group by bucket_role, migration_state
order by bucket_role, migration_state;

select a.id, a.title, count(m.id) as media_rows,
       count(pma.id) filter (where pma.variant = 'display') as display_assets
from public.albums a
left join public.media m on m.album_id = a.id and m.deleted_at is null
left join public.private_media_assets pma on pma.media_id = m.id
where a.status = 'private' and a.deleted_at is null
group by a.id, a.title
order by a.title;
```

The application compatibility fallback reads legacy keys server-side only until the manifest migration is applied. It does not serialize those keys to HTML or API JSON.

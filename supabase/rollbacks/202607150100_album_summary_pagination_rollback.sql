-- Reverses the additive Milestone 8 query layer only. No album or media data is changed.

drop function if exists public.list_album_summaries(text, text, integer, integer, timestamptz, text);

drop index if exists public.media_album_preview_cursor_idx;
drop index if exists public.albums_private_cursor_idx;
drop index if exists public.albums_updating_cursor_idx;
drop index if exists public.albums_public_cursor_idx;

notify pgrst, 'reload schema';

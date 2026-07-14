-- Roll back only the additive private-album JWT/RLS policies from 202607141830.
-- The legacy trusted server path remains available during the deployment window.

drop policy if exists "Authorized users read granted private comments" on public.comments;
drop policy if exists "Authorized users read granted private media" on public.media;
drop function if exists public.can_access_private_album(uuid);

notify pgrst, 'reload schema';

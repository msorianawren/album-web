-- Backward-compatible authorization helper for JWT/RLS private album reads.
-- Apply before deploying application code that switches private reads to the user client.

create or replace function public.can_access_private_album(target_album_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  current_role text;
  current_is_blocked boolean := false;
  selected_status text;
  global_status text;
begin
  if current_user_id is null or target_album_id is null then
    return false;
  end if;

  select p.role, coalesce(p.is_blocked, false)
  into current_role, current_is_blocked
  from public.user_profiles p
  where p.user_id = current_user_id;

  if current_is_blocked then
    return false;
  end if;

  if current_role in ('admin', 'founder') then
    return true;
  end if;

  select g.status
  into selected_status
  from public.album_access_grants g
  where g.scope = 'selected_albums'
    and g.album_id = target_album_id
    and (
      g.user_id = current_user_id
      or (
        current_email <> ''
        and g.email_normalized = current_email
      )
    )
  order by coalesce(g.revoked_at, g.granted_at, g.updated_at, g.created_at) desc, g.id desc
  limit 1;

  if selected_status = 'revoked' then
    return false;
  end if;

  if selected_status = 'active' then
    return true;
  end if;

  select g.status
  into global_status
  from public.album_access_grants g
  where g.scope = 'all_private'
    and (
      g.user_id = current_user_id
      or (
        current_email <> ''
        and g.email_normalized = current_email
      )
    )
  order by coalesce(g.revoked_at, g.granted_at, g.updated_at, g.created_at) desc, g.id desc
  limit 1;

  if global_status = 'revoked' then
    return false;
  end if;

  if global_status = 'active' then
    return true;
  end if;

  if current_email <> '' and exists (
    select 1
    from public.album_invites i
    where lower(i.email) = current_email
      and (i.is_global = true or i.album_id = target_album_id)
  ) then
    return true;
  end if;

  return exists (
    select 1
    from public.album_access_requests r
    where r.requester_user_id = current_user_id
      and r.status in ('approved', 'auto_approved')
      and (
        r.scope = 'all_private'
        or r.album_id = target_album_id
        or target_album_id = any(coalesce(r.requested_album_ids, '{}'::uuid[]))
      )
  );
end;
$$;

revoke all on function public.can_access_private_album(uuid) from public;
revoke execute on function public.can_access_private_album(uuid) from anon;
grant execute on function public.can_access_private_album(uuid) to authenticated, service_role;

drop policy if exists "Authorized users read granted private media" on public.media;
create policy "Authorized users read granted private media"
on public.media
for select
to authenticated
using (
  exists (
    select 1
    from public.albums a
    where a.id = media.album_id
      and a.status = 'private'
      and public.can_access_private_album(a.id)
  )
);

drop policy if exists "Authorized users read granted private comments" on public.comments;
create policy "Authorized users read granted private comments"
on public.comments
for select
to authenticated
using (
  is_hidden = false
  and deleted_at is null
  and exists (
    select 1
    from public.albums a
    where a.id = comments.album_id
      and a.status = 'private'
      and public.can_access_private_album(a.id)
  )
);

notify pgrst, 'reload schema';

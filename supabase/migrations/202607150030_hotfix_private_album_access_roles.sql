-- P0: avoid PostgreSQL session keywords when evaluating application roles.
create or replace function public.private_album_access_decision(target_album_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  v_profile_role text;
  v_is_blocked boolean;
  v_selected_status text;
  v_global_status text;
  v_request_status text;
begin
  if v_user_id is null then
    return 'DENIED_ANONYMOUS';
  end if;

  select up.role, coalesce(up.is_blocked, false)
  into v_profile_role, v_is_blocked
  from public.user_profiles as up
  where up.user_id = v_user_id;

  if not found then
    return 'DENIED_PROFILE_MISSING';
  end if;

  if v_is_blocked then
    return 'DENIED_BLOCKED';
  end if;

  if v_profile_role = 'founder' then
    return 'ALLOWED_FOUNDER';
  end if;

  if v_profile_role = 'admin' then
    return 'ALLOWED_ADMIN';
  end if;

  if target_album_id is null then
    return 'DENIED_NO_GRANT';
  end if;

  select ag.status
  into v_selected_status
  from public.album_access_grants as ag
  where ag.scope = 'selected_albums'
    and ag.album_id = target_album_id
    and (
      ag.user_id = v_user_id
      or (v_email <> '' and ag.email_normalized = v_email)
    )
  order by coalesce(ag.revoked_at, ag.granted_at, ag.updated_at, ag.created_at) desc, ag.id desc
  limit 1;

  -- Album-specific decisions outrank global grants and legacy fallbacks.
  if v_selected_status = 'revoked' then
    return 'DENIED_REVOKED';
  end if;

  if v_selected_status = 'active' then
    return 'ALLOWED_SELECTED_GRANT';
  end if;

  select ag.status
  into v_global_status
  from public.album_access_grants as ag
  where ag.scope = 'all_private'
    and (
      ag.user_id = v_user_id
      or (v_email <> '' and ag.email_normalized = v_email)
    )
  order by coalesce(ag.revoked_at, ag.granted_at, ag.updated_at, ag.created_at) desc, ag.id desc
  limit 1;

  -- A global revoke blocks global, request, and legacy-invite fallbacks. A
  -- more-specific active selected grant has already been accepted above.
  if v_global_status = 'revoked' then
    return 'DENIED_REVOKED';
  end if;

  if v_global_status = 'active' then
    return 'ALLOWED_GLOBAL_GRANT';
  end if;

  -- Legacy invites remain a temporary fallback after explicit grant/revoke
  -- decisions, matching the documented migration-window product rule.
  if v_email <> '' and exists (
    select 1
    from public.album_invites as ai
    where lower(ai.email) = v_email
      and (ai.is_global = true or ai.album_id = target_album_id)
  ) then
    return 'ALLOWED_LEGACY_INVITE';
  end if;

  select ar.status
  into v_request_status
  from public.album_access_requests as ar
  where ar.requester_user_id = v_user_id
    and (
      ar.scope = 'all_private'
      or ar.album_id = target_album_id
      or target_album_id = any(coalesce(ar.requested_album_ids, '{}'::uuid[]))
    )
  order by coalesce(ar.reviewed_at, ar.updated_at, ar.created_at) desc, ar.id desc
  limit 1;

  if v_request_status in ('approved', 'auto_approved') then
    return 'ALLOWED_APPROVED_REQUEST';
  end if;

  if v_request_status in ('rejected', 'denied') then
    return 'DENIED_REJECTED';
  end if;

  if v_request_status in ('pending', 'needs_manual_review') then
    return 'DENIED_PENDING';
  end if;

  return 'DENIED_NO_GRANT';
end;
$$;

create or replace function public.can_access_private_album(target_album_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select left(public.private_album_access_decision(target_album_id), 8) = 'ALLOWED_';
$$;

revoke all on function public.private_album_access_decision(uuid) from public;
revoke execute on function public.private_album_access_decision(uuid) from anon, authenticated;
grant execute on function public.private_album_access_decision(uuid) to service_role;

revoke all on function public.can_access_private_album(uuid) from public;
revoke execute on function public.can_access_private_album(uuid) from anon;
grant execute on function public.can_access_private_album(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================================
-- Migration: Fix private album access decision for Founder & Admin accounts
-- Date: 2026-08-06
-- Description: Ensures Founder & Admin roles (and owner email ms.orianawren@gmail.com)
--              always receive ALLOWED status for private albums.
-- ============================================================================

create or replace function public.private_album_access_decision(target_album_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text := lower(coalesce((select email from auth.users where id = v_user_id), ''));
  v_profile_role text;
  v_is_blocked boolean;
  v_selected_status text;
  v_global_status text;
  v_request_status text;
begin
  if v_user_id is null then return 'DENIED_UNAUTHENTICATED'; end if;

  select up.role, coalesce(up.is_blocked, false)
  into v_profile_role, v_is_blocked
  from public.user_profiles as up
  where up.user_id = v_user_id;

  if v_is_blocked then return 'DENIED_BLOCKED'; end if;

  -- Founder & Admin role check: Founder/Admin ALWAYS have full access
  if v_profile_role in ('founder', 'admin') then return 'ALLOWED_ADMIN'; end if;
  if v_email = 'ms.orianawren@gmail.com' then return 'ALLOWED_FOUNDER'; end if;

  if target_album_id is null then return 'DENIED_NO_GRANT'; end if;

  -- Feather purchases
  if exists (
    select 1
    from public.album_feather_purchases as purchase
    where purchase.album_id = target_album_id
      and purchase.user_id = v_user_id
  ) then
    return 'ALLOWED_FEATHER_PURCHASE';
  end if;

  -- Selected album grants
  select ag.status into v_selected_status
  from public.album_access_grants as ag
  where ag.scope = 'selected_albums'
    and ag.album_id = target_album_id
    and (ag.user_id = v_user_id or (v_email <> '' and ag.email_normalized = v_email))
  order by coalesce(ag.revoked_at, ag.granted_at, ag.updated_at, ag.created_at) desc, ag.id desc
  limit 1;

  if v_selected_status = 'revoked' then return 'DENIED_REVOKED'; end if;
  if v_selected_status = 'active' then return 'ALLOWED_SELECTED_GRANT'; end if;

  -- Global all_private grants
  select ag.status into v_global_status
  from public.album_access_grants as ag
  where ag.scope = 'all_private'
    and (ag.user_id = v_user_id or (v_email <> '' and ag.email_normalized = v_email))
  order by coalesce(ag.revoked_at, ag.granted_at, ag.updated_at, ag.created_at) desc, ag.id desc
  limit 1;

  if v_global_status = 'revoked' then return 'DENIED_REVOKED'; end if;
  if v_global_status = 'active' then return 'ALLOWED_GLOBAL_GRANT'; end if;

  -- Legacy invites
  if v_email <> '' and exists (
    select 1 from public.album_invites as invite
    where lower(invite.email) = v_email
      and (invite.is_global = true or invite.album_id = target_album_id)
  ) then return 'ALLOWED_LEGACY_INVITE'; end if;

  -- Access requests
  select request.status into v_request_status
  from public.album_access_requests as request
  where request.requester_user_id = v_user_id
    and (request.scope = 'all_private' or request.album_id = target_album_id or target_album_id = any(coalesce(request.requested_album_ids, '{}'::uuid[])))
  order by coalesce(request.reviewed_at, request.updated_at, request.created_at) desc, request.id desc
  limit 1;

  if v_request_status in ('approved', 'auto_approved') then return 'ALLOWED_APPROVED_REQUEST'; end if;
  if v_request_status in ('rejected', 'denied') then return 'DENIED_REJECTED'; end if;
  if v_request_status in ('pending', 'needs_manual_review') then return 'DENIED_PENDING'; end if;

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

notify pgrst, 'reload schema';

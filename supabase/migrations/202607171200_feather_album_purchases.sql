-- Wren Feather purchases are permanent, non-transferable private-album entitlements.
-- Prices and balances are resolved exclusively inside the transaction below.

alter table public.albums
  add column if not exists feather_purchase_enabled boolean not null default true,
  add column if not exists feather_price integer;

alter table public.albums
  drop constraint if exists albums_feather_price_range_check;

alter table public.albums
  add constraint albums_feather_price_range_check
  check (feather_price is null or feather_price between 1 and 100000);

alter table public.site_settings
  add column if not exists private_album_default_feather_price integer not null default 150;

alter table public.site_settings
  drop constraint if exists site_settings_private_album_default_feather_price_check;

alter table public.site_settings
  add constraint site_settings_private_album_default_feather_price_check
  check (private_album_default_feather_price between 1 and 100000);

update public.site_settings
set private_album_default_feather_price = 150
where private_album_default_feather_price is null;

create table if not exists public.album_feather_purchases (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  price_paid integer not null check (price_paid between 1 and 100000),
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (album_id, user_id)
);

create index if not exists idx_album_feather_purchases_user_album
  on public.album_feather_purchases (user_id, album_id);

create table if not exists public.wren_feather_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  delta integer not null check (delta <> 0),
  event_type text not null check (event_type in ('album_purchase')),
  album_id uuid references public.albums(id) on delete restrict,
  purchase_id uuid unique references public.album_feather_purchases(id) on delete restrict,
  balance_after integer not null check (balance_after >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_wren_feather_ledger_user_created
  on public.wren_feather_ledger (user_id, created_at desc);

alter table public.album_feather_purchases enable row level security;
alter table public.wren_feather_ledger enable row level security;

revoke all on table public.album_feather_purchases, public.wren_feather_ledger from anon, authenticated;

alter table public.album_access_history
  drop constraint if exists album_access_history_action_check;

alter table public.album_access_history
  add constraint album_access_history_action_check
  check (action in (
    'request_created',
    'request_approved',
    'request_auto_approved',
    'request_denied',
    'request_needs_manual_review',
    'grant_created',
    'grant_revoked',
    'grant_reactivated',
    'feather_purchase_completed'
  ));

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
  if v_user_id is null then return 'DENIED_ANONYMOUS'; end if;

  select up.role, coalesce(up.is_blocked, false)
  into v_profile_role, v_is_blocked
  from public.user_profiles as up
  where up.user_id = v_user_id;

  if not found then return 'DENIED_PROFILE_MISSING'; end if;
  if v_is_blocked then return 'DENIED_BLOCKED'; end if;
  if v_profile_role = 'founder' then return 'ALLOWED_FOUNDER'; end if;
  if v_profile_role = 'admin' then return 'ALLOWED_ADMIN'; end if;
  if target_album_id is null then return 'DENIED_NO_GRANT'; end if;

  -- Purchases are independent from the grant/revoke workflow. A manual
  -- revocation must never void an earned-feather entitlement.
  if exists (
    select 1
    from public.album_feather_purchases as purchase
    where purchase.album_id = target_album_id
      and purchase.user_id = v_user_id
  ) then
    return 'ALLOWED_FEATHER_PURCHASE';
  end if;

  select ag.status into v_selected_status
  from public.album_access_grants as ag
  where ag.scope = 'selected_albums'
    and ag.album_id = target_album_id
    and (ag.user_id = v_user_id or (v_email <> '' and ag.email_normalized = v_email))
  order by coalesce(ag.revoked_at, ag.granted_at, ag.updated_at, ag.created_at) desc, ag.id desc
  limit 1;

  if v_selected_status = 'revoked' then return 'DENIED_REVOKED'; end if;
  if v_selected_status = 'active' then return 'ALLOWED_SELECTED_GRANT'; end if;

  select ag.status into v_global_status
  from public.album_access_grants as ag
  where ag.scope = 'all_private'
    and (ag.user_id = v_user_id or (v_email <> '' and ag.email_normalized = v_email))
  order by coalesce(ag.revoked_at, ag.granted_at, ag.updated_at, ag.created_at) desc, ag.id desc
  limit 1;

  if v_global_status = 'revoked' then return 'DENIED_REVOKED'; end if;
  if v_global_status = 'active' then return 'ALLOWED_GLOBAL_GRANT'; end if;

  if v_email <> '' and exists (
    select 1 from public.album_invites as invite
    where lower(invite.email) = v_email
      and (invite.is_global = true or invite.album_id = target_album_id)
  ) then return 'ALLOWED_LEGACY_INVITE'; end if;

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

create or replace function public.purchase_private_album_with_feathers(target_album_id uuid)
returns table(purchase_id uuid, price_paid integer, remaining_feathers integer, already_owned boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_album public.albums%rowtype;
  v_profile_role text;
  v_is_blocked boolean;
  v_price integer;
  v_purchase_id uuid;
  v_remaining integer;
begin
  if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  select up.role, coalesce(up.is_blocked, false)
  into v_profile_role, v_is_blocked
  from public.user_profiles as up
  where up.user_id = v_user_id;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if v_is_blocked then raise exception 'ACCOUNT_BLOCKED'; end if;
  if v_profile_role in ('founder', 'admin') then raise exception 'ALREADY_AUTHORIZED'; end if;

  select * into v_album
  from public.albums as album
  where album.id = target_album_id and album.deleted_at is null
  for update;
  if not found then raise exception 'ALBUM_NOT_FOUND'; end if;
  if v_album.status <> 'private' or not v_album.feather_purchase_enabled then
    raise exception 'PURCHASE_NOT_AVAILABLE';
  end if;

  -- Serialize all debits for one user before looking for an existing purchase.
  insert into public.puzzle_user_profiles (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select profile.total_feathers into v_remaining
  from public.puzzle_user_profiles as profile
  where profile.user_id = v_user_id
  for update;

  select purchase.id, purchase.price_paid
  into v_purchase_id, v_price
  from public.album_feather_purchases as purchase
  where purchase.album_id = target_album_id and purchase.user_id = v_user_id;
  if found then
    return query select v_purchase_id, v_price, v_remaining, true;
    return;
  end if;

  select coalesce(album.feather_price, settings.private_album_default_feather_price)
  into v_price
  from public.albums as album
  cross join public.site_settings as settings
  where album.id = target_album_id and settings.id = 'default';
  if v_price is null or v_price not between 1 and 100000 then raise exception 'INVALID_PRICE_CONFIGURATION'; end if;
  if v_remaining < v_price then raise exception 'INSUFFICIENT_FEATHERS'; end if;

  insert into public.album_feather_purchases (album_id, user_id, price_paid)
  values (target_album_id, v_user_id, v_price)
  returning id into v_purchase_id;

  update public.puzzle_user_profiles as profile
  set total_feathers = profile.total_feathers - v_price,
      updated_at = now()
  where profile.user_id = v_user_id and profile.total_feathers >= v_price
  returning total_feathers into v_remaining;
  if not found then raise exception 'INSUFFICIENT_FEATHERS'; end if;

  insert into public.wren_feather_ledger (user_id, delta, event_type, album_id, purchase_id, balance_after, metadata)
  values (v_user_id, -v_price, 'album_purchase', target_album_id, v_purchase_id, v_remaining, jsonb_build_object('source', 'private_album_unlock'));

  insert into public.album_access_history (actor_user_id, target_user_id, action, scope, album_ids, reason, metadata)
  values (v_user_id, v_user_id, 'feather_purchase_completed', 'selected_albums', array[target_album_id], 'Wren Feather purchase', jsonb_build_object('purchase_id', v_purchase_id, 'price_paid', v_price));

  return query select v_purchase_id, v_price, v_remaining, false;
end;
$$;

revoke all on function public.private_album_access_decision(uuid) from public;
revoke execute on function public.private_album_access_decision(uuid) from anon, authenticated;
grant execute on function public.private_album_access_decision(uuid) to service_role;

revoke all on function public.can_access_private_album(uuid) from public;
revoke execute on function public.can_access_private_album(uuid) from anon;
grant execute on function public.can_access_private_album(uuid) to authenticated, service_role;

revoke all on function public.purchase_private_album_with_feathers(uuid) from public, anon;
grant execute on function public.purchase_private_album_with_feathers(uuid) to authenticated;

notify pgrst, 'reload schema';

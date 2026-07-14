-- Upgrade private album access requests to support multi-album/all-private workflows.
-- Non-destructive: keeps legacy album_id/requester_name/requester_phone/admin_note columns.

create extension if not exists pgcrypto;

alter table public.album_access_requests
  add column if not exists full_name text,
  add column if not exists phone_normalized text,
  add column if not exists phone_hash text,
  add column if not exists scope text not null default 'selected_albums',
  add column if not exists requested_album_ids uuid[],
  add column if not exists review_note text,
  add column if not exists auto_approve_at timestamptz,
  add column if not exists auto_approved_at timestamptz,
  add column if not exists risk_flags jsonb not null default '{}'::jsonb,
  add column if not exists policy_version text,
  add column if not exists policy_accepted_at timestamptz;

alter table public.album_access_requests
  alter column album_id drop not null;

update public.album_access_requests
set
  full_name = coalesce(full_name, requester_name),
  phone_normalized = coalesce(phone_normalized, requester_phone),
  requested_album_ids = case
    when requested_album_ids is null and album_id is not null then array[album_id]::uuid[]
    else requested_album_ids
  end,
  auto_approve_at = coalesce(auto_approve_at, created_at + interval '7 days')
where full_name is null
   or phone_normalized is null
   or requested_album_ids is null
   or auto_approve_at is null;

do $$
begin
  alter table public.album_access_requests drop constraint if exists album_access_requests_status_check;
  alter table public.album_access_requests drop constraint if exists album_access_requests_scope_check;
  alter table public.album_access_requests drop constraint if exists album_access_requests_scope_album_ids_check;
exception
  when undefined_object then null;
end $$;

alter table public.album_access_requests
  add constraint album_access_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'denied', 'auto_approved', 'cancelled', 'needs_manual_review'));

alter table public.album_access_requests
  add constraint album_access_requests_scope_check
  check (scope in ('selected_albums', 'all_private'));

alter table public.album_access_requests
  add constraint album_access_requests_scope_album_ids_check
  check (
    scope = 'all_private'
    or coalesce(array_length(requested_album_ids, 1), 0) >= 1
    or album_id is not null
  );

create index if not exists idx_album_access_requests_auto_status
  on public.album_access_requests (auto_approve_at, status);

create index if not exists idx_album_access_requests_scope_status
  on public.album_access_requests (scope, status);

create index if not exists idx_album_access_requests_phone_hash
  on public.album_access_requests (phone_hash);

create index if not exists idx_album_access_requests_requested_album_ids
  on public.album_access_requests using gin (requested_album_ids);

create table if not exists public.album_access_history (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  target_user_id uuid,
  target_email text,
  action text not null check (
    action in (
      'request_created',
      'request_approved',
      'request_auto_approved',
      'request_denied',
      'request_needs_manual_review',
      'grant_created',
      'grant_revoked',
      'grant_reactivated'
    )
  ),
  scope text check (scope in ('selected_albums', 'all_private')),
  request_id uuid references public.album_access_requests(id) on delete set null,
  grant_id uuid references public.album_access_grants(id) on delete set null,
  album_ids uuid[],
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.album_access_history enable row level security;

create index if not exists idx_album_access_history_created
  on public.album_access_history (created_at desc);

create index if not exists idx_album_access_history_action_created
  on public.album_access_history (action, created_at desc);

create index if not exists idx_album_access_history_target_user
  on public.album_access_history (target_user_id, created_at desc);

create index if not exists idx_album_access_history_target_email
  on public.album_access_history (target_email, created_at desc);

create index if not exists idx_album_access_history_album_ids
  on public.album_access_history using gin (album_ids);

do $$
begin
  drop policy if exists "Admins can manage album_access_history" on public.album_access_history;
  drop policy if exists "Users cannot read album_access_history" on public.album_access_history;
end $$;

create policy "Admins can manage album_access_history"
on public.album_access_history
for all
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = auth.uid()
      and p.role in ('founder', 'admin')
      and coalesce(p.is_blocked, false) = false
  )
)
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = auth.uid()
      and p.role in ('founder', 'admin')
      and coalesce(p.is_blocked, false) = false
  )
);

insert into public.album_access_history (
  actor_user_id,
  target_user_id,
  target_email,
  action,
  scope,
  request_id,
  album_ids,
  reason,
  metadata,
  created_at
)
select
  reviewed_by,
  requester_user_id,
  requester_email,
  case
    when status in ('approved', 'auto_approved') then 'request_approved'
    when status in ('rejected', 'denied') then 'request_denied'
    else 'request_created'
  end,
  coalesce(scope, 'selected_albums'),
  id,
  coalesce(requested_album_ids, case when album_id is not null then array[album_id]::uuid[] else null end),
  coalesce(review_note, admin_note),
  jsonb_build_object('source', 'backfill'),
  coalesce(reviewed_at, created_at)
from public.album_access_requests r
where not exists (
  select 1
  from public.album_access_history h
  where h.request_id = r.id
    and h.metadata ->> 'source' = 'backfill'
);

insert into public.album_access_history (
  actor_user_id,
  target_user_id,
  target_email,
  action,
  scope,
  grant_id,
  album_ids,
  reason,
  metadata,
  created_at
)
select
  case when status = 'revoked' then revoked_by else granted_by end,
  user_id,
  email_normalized,
  case when status = 'revoked' then 'grant_revoked' else 'grant_created' end,
  scope,
  id,
  case when album_id is not null then array[album_id]::uuid[] else null end,
  coalesce(revoke_reason, note),
  jsonb_build_object('source', 'backfill'),
  coalesce(case when status = 'revoked' then revoked_at else granted_at end, updated_at, created_at)
from public.album_access_grants g
where not exists (
  select 1
  from public.album_access_history h
  where h.grant_id = g.id
    and h.metadata ->> 'source' = 'backfill'
);

notify pgrst, 'reload schema';

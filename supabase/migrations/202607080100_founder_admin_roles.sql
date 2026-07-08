alter table public.user_profiles
  add column if not exists role text not null default 'user',
  add column if not exists promoted_by uuid references auth.users(id) on delete set null,
  add column if not exists promoted_at timestamptz,
  add column if not exists revoked_by uuid references auth.users(id) on delete set null,
  add column if not exists revoked_at timestamptz,
  add column if not exists last_role_changed_at timestamptz,
  add column if not exists role_change_reason text;

alter table public.user_profiles
  drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role in ('founder', 'admin', 'user'));

create index if not exists user_profiles_role_idx on public.user_profiles(role);
create index if not exists user_profiles_promoted_at_idx on public.user_profiles(promoted_at);
create index if not exists user_profiles_revoked_at_idx on public.user_profiles(revoked_at);

update public.user_profiles
set
  role = 'founder',
  promoted_at = coalesce(promoted_at, now()),
  last_role_changed_at = coalesce(last_role_changed_at, now()),
  role_change_reason = coalesce(role_change_reason, 'Initial founder migration fallback.')
where user_id = (
  select user_id
  from public.user_profiles
  order by created_at asc
  limit 1
)
and not exists (
  select 1
  from public.user_profiles
  where role = 'founder'
);

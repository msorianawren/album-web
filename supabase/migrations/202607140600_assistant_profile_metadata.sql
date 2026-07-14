alter table public.user_profiles
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.user_profiles.metadata is
  'Per-user non-secret settings such as assistant preferences.';

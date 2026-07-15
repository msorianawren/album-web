-- Reconcile columns from manually applied legacy migrations before worker rollout.
alter table public.albums
  add column if not exists safe_preview_url text;

alter table public.about_profile
  add column if not exists skills jsonb default '[]'::jsonb;

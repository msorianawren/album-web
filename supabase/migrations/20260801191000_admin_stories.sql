create table if not exists public.admin_stories (
  id uuid primary key default gen_random_uuid(),
  video_url text not null,
  poster_url text not null,
  title text,
  is_available boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_stories_available_idx on public.admin_stories (is_available, created_at desc);

create trigger admin_stories_set_updated_at before update on public.admin_stories for each row execute function public.set_updated_at();

alter table public.admin_stories enable row level security;
create policy "Admin stories are viewable by everyone" on public.admin_stories for select using (is_available = true);

-- Admins handle management through service_role API or specific RPCs, but let's allow founders if needed:
create policy "Admins can manage stories" on public.admin_stories for all to authenticated using (
  exists (select 1 from public.user_profiles where user_id = auth.uid() and role in ('admin', 'founder'))
) with check (
  exists (select 1 from public.user_profiles where user_id = auth.uid() and role in ('admin', 'founder'))
);

-- Add the new settings column
alter table public.landing_page_settings add column if not exists admin_stories_settings jsonb not null default '{
  "enabled": false,
  "eyebrow": "Behind the scenes",
  "heading": "Founder Stories",
  "selectedItemIds": []
}'::jsonb;

-- Cleanup the old facebook feed stuff
drop function if exists public.delete_social_embed_item_and_cleanup(uuid);
alter table public.landing_page_settings drop column if exists facebook_feed_settings;
drop table if exists public.social_embed_items;

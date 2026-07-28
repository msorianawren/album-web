create table if not exists public.social_embed_items (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'facebook' check (provider = 'facebook'),
  source_url text not null,
  canonical_url text not null unique,
  embed_kind text not null check (embed_kind in ('post', 'video', 'reel')),
  title text,
  caption text,
  poster_url text not null,
  poster_alt text,
  published_at timestamptz,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  aspect_ratio text,
  is_available boolean not null default true,
  availability_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_embed_items_facebook_published_idx on public.social_embed_items (provider, is_available, published_at desc);
drop trigger if exists social_embed_items_set_updated_at on public.social_embed_items;
create trigger social_embed_items_set_updated_at before update on public.social_embed_items for each row execute function public.set_updated_at();

alter table public.social_embed_items enable row level security;
create policy "No direct client social embed access" on public.social_embed_items for all to anon, authenticated using (false) with check (false);

alter table public.landing_page_settings add column if not exists facebook_feed_settings jsonb not null default '{
  "enabled": false,
  "eyebrow": "Recent Motion",
  "heading": "Stories in motion",
  "description": "A selection of recent moving images and behind-the-scenes moments.",
  "selectedItemIds": [],
  "featuredItemId": null,
  "layout": "editorial",
  "showCaption": true,
  "showPublishedDate": true,
  "showFacebookBranding": true,
  "maxItems": 4,
  "itemOverrides": {}
}'::jsonb;

create or replace function public.delete_social_embed_item_and_cleanup(p_item_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare settings jsonb; retained jsonb;
begin
  delete from public.social_embed_items where id = p_item_id;
  if not found then return false; end if;
  select facebook_feed_settings into settings from public.landing_page_settings where id = 'home' for update;
  if settings is not null then
    select coalesce(jsonb_agg(value), '[]'::jsonb) into retained
      from jsonb_array_elements_text(coalesce(settings->'selectedItemIds', '[]'::jsonb)) value
      where value <> p_item_id::text;
    settings := jsonb_set(settings, '{selectedItemIds}', retained, true);
    if settings->>'featuredItemId' = p_item_id::text then settings := jsonb_set(settings, '{featuredItemId}', 'null'::jsonb, true); end if;
    update public.landing_page_settings set facebook_feed_settings = settings where id = 'home';
  end if;
  return true;
end;
$$;
revoke all on function public.delete_social_embed_item_and_cleanup(uuid) from public, anon, authenticated;
grant execute on function public.delete_social_embed_item_and_cleanup(uuid) to service_role;

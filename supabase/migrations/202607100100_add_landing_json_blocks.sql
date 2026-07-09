-- Migration: Add JSON blocks to landing_page_settings
-- Description: Adds social_links, media_items, collaborators, and background_settings

alter table public.landing_page_settings
add column if not exists social_links jsonb not null default '[]'::jsonb,
add column if not exists media_items jsonb not null default '[]'::jsonb,
add column if not exists collaborators jsonb not null default '[]'::jsonb,
add column if not exists background_settings jsonb not null default '{}'::jsonb;

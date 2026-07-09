-- Migration: Add footer settings to site_settings table
-- Description: Adds footer_description and footer_note columns

alter table public.site_settings
add column if not exists footer_description text not null default 'Oriana Wren is a private editorial album space for cinematic portraits, travel diaries, Vietnamese elegance, fashion stories, and selected visual collections.',
add column if not exists footer_note text not null default 'Some albums are public, some are still being updated, and selected collections remain private by request.';

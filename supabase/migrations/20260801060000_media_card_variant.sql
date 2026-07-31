-- Migration: Add card variant to media table
-- Description: Adds card_url and card_r2_key to store the pre-processed ahead-of-time optimized image specifically for Album Card previews.

ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS card_r2_key text,
ADD COLUMN IF NOT EXISTS card_url text,
ADD COLUMN IF NOT EXISTS avif_card_r2_key text;

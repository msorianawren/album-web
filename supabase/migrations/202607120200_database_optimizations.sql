-- Performance optimizations: Non-blocking indexes for high-frequency access patterns

-- 1. Contact Messages (API duplicate checking & Admin Inbox)
create index concurrently if not exists contact_messages_status_idx on public.contact_messages(status, created_at desc);
create index concurrently if not exists contact_messages_duplicate_check_idx on public.contact_messages(ip_hash, reply_email, created_at desc);

-- 2. Media Processing & Security Status (Background workers & Admin review)
create index concurrently if not exists media_processing_status_idx on public.media(processing_status) where processing_status = 'pending';
create index concurrently if not exists media_security_status_idx on public.media(security_status) where security_status = 'needs_review';

-- 3. Likes (Quick checks for if a user has liked something)
create index concurrently if not exists likes_user_client_idx on public.likes(client_id, user_id);

-- 4. Album Share Links (Foreign key index)
create index concurrently if not exists album_share_links_album_idx on public.album_share_links(album_id);

-- Conversations & Notifications Upgrades

ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON public.contact_messages(user_id);

-- 1. Create threaded replies for contact messages
CREATE TABLE IF NOT EXISTS public.contact_message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  author_type text not null check (author_type in ('user', 'admin')),
  author_user_id uuid references auth.users(id),
  body text not null,
  public_display_name text not null default 'Oriana Wren',
  is_internal_note boolean default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  deleted_reason text
);

CREATE INDEX IF NOT EXISTS idx_contact_message_replies_message_id 
ON public.contact_message_replies (message_id, created_at ASC);

-- Row Level Security for contact_message_replies
ALTER TABLE public.contact_message_replies ENABLE ROW LEVEL SECURITY;

-- Admins can read all replies
CREATE POLICY "Admins can view all contact_message_replies" 
ON public.contact_message_replies FOR SELECT 
USING (
  exists (
    select 1 from public.user_profiles 
    where user_profiles.user_id = auth.uid() 
    and user_profiles.role in ('admin', 'founder')
  )
);

-- Users can read their own thread's replies (if not an internal note)
CREATE POLICY "Users can view replies for their own messages" 
ON public.contact_message_replies FOR SELECT 
USING (
  is_internal_note = false AND
  exists (
    select 1 from public.contact_messages 
    where contact_messages.id = contact_message_replies.message_id 
    and contact_messages.user_id = auth.uid()
  )
);

-- Admins can insert replies
CREATE POLICY "Admins can insert contact_message_replies" 
ON public.contact_message_replies FOR INSERT 
WITH CHECK (
  exists (
    select 1 from public.user_profiles 
    where user_profiles.user_id = auth.uid() 
    and user_profiles.role in ('admin', 'founder')
  )
);

-- Users can insert replies to their own threads
CREATE POLICY "Users can insert replies to their own threads" 
ON public.contact_message_replies FOR INSERT 
WITH CHECK (
  author_type = 'user' AND
  exists (
    select 1 from public.contact_messages 
    where contact_messages.id = contact_message_replies.message_id 
    and contact_messages.user_id = auth.uid()
  )
);


-- 2. Create internal notification system
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  target_url text,
  status text not null default 'unread' check (status in ('unread', 'read', 'dismissed')),
  metadata jsonb,
  created_at timestamp with time zone not null default now(),
  read_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  expires_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status_created 
ON public.notifications (recipient_user_id, status, created_at DESC);

-- Row Level Security for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (recipient_user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (recipient_user_id = auth.uid());

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

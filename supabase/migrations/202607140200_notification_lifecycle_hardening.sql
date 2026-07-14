-- Notification lifecycle hardening: idempotent schema, RLS, indexes, and legacy type normalization.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  target_url text,
  status text not null default 'unread',
  metadata jsonb,
  created_at timestamp with time zone not null default now(),
  read_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  expires_at timestamp with time zone
);

alter table public.notifications
  add column if not exists read_at timestamp with time zone,
  add column if not exists dismissed_at timestamp with time zone,
  add column if not exists expires_at timestamp with time zone,
  add column if not exists metadata jsonb;

update public.notifications
set type = case
  when type = 'access_granted' then 'album_access_granted'
  when type = 'access_revoked' then 'album_access_revoked'
  else type
end
where type in ('access_granted', 'access_revoked');

alter table public.notifications
  drop constraint if exists notifications_status_check,
  add constraint notifications_status_check check (status in ('unread', 'read', 'dismissed')),
  drop constraint if exists notifications_type_check,
  add constraint notifications_type_check check (
    type in (
      'album_access_granted',
      'album_access_revoked',
      'access_request_approved',
      'access_request_rejected',
      'message_reply',
      'account_blocked',
      'account_unblocked',
      'admin_new_request',
      'admin_new_message'
    )
  ),
  drop constraint if exists notifications_title_length_check,
  add constraint notifications_title_length_check check (char_length(title) between 1 and 120),
  drop constraint if exists notifications_body_length_check,
  add constraint notifications_body_length_check check (body is null or char_length(body) <= 500),
  drop constraint if exists notifications_target_url_check,
  add constraint notifications_target_url_check check (
    target_url is null or (
      char_length(target_url) <= 300
      and target_url like '/%'
      and target_url not like '//%'
      and target_url !~ '^[a-zA-Z][a-zA-Z0-9+.-]*:'
    )
  );

create index if not exists idx_notifications_recipient_status_created
  on public.notifications (recipient_user_id, status, created_at desc);

create index if not exists idx_notifications_recipient_created
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists idx_notifications_expires_at
  on public.notifications (expires_at)
  where expires_at is not null;

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_user_id = auth.uid());

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (recipient_user_id = auth.uid())
  with check (
    recipient_user_id = auth.uid()
    and status in ('unread', 'read', 'dismissed')
  );

notify pgrst, 'reload schema';

-- Unified, privacy-safe help conversations for Contact and Oriana Companion.
create table if not exists public.help_threads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  guest_session_hash text,
  owner_email text,
  owner_name text,
  source text not null check (source in ('contact', 'assistant', 'private_access', 'system')),
  status text not null default 'waiting_admin' check (status in ('open', 'waiting_admin', 'waiting_user', 'closed', 'archived', 'blocked')),
  subject text,
  last_message_at timestamptz not null default now(),
  last_user_message_at timestamptz,
  last_admin_message_at timestamptz,
  assigned_admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_threads_owner_or_guest check (owner_user_id is not null or guest_session_hash is not null)
);

create table if not exists public.help_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.help_threads(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'assistant', 'admin', 'system')),
  sender_user_id uuid references auth.users(id) on delete set null,
  public_sender_name text not null,
  public_sender_avatar_url text,
  body text not null check (char_length(body) between 1 and 5000),
  body_preview text,
  metadata jsonb not null default '{}'::jsonb,
  is_internal_note boolean not null default false,
  read_by_user_at timestamptz,
  read_by_admin_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.help_threads
  add column if not exists legacy_contact_message_id uuid unique references public.contact_messages(id) on delete set null;
alter table public.help_messages
  add column if not exists legacy_contact_message_id uuid unique references public.contact_messages(id) on delete set null,
  add column if not exists legacy_contact_reply_id uuid unique references public.contact_message_replies(id) on delete set null;

create index if not exists idx_help_threads_owner_status_last_message
  on public.help_threads (owner_user_id, status, last_message_at desc);
create index if not exists idx_help_threads_status_last_message
  on public.help_threads (status, last_message_at desc);
create index if not exists idx_help_threads_guest_session
  on public.help_threads (guest_session_hash) where guest_session_hash is not null;
create index if not exists idx_help_messages_thread_created
  on public.help_messages (thread_id, created_at desc);

-- Preserve legacy Contact history in the unified read model without changing legacy rows.
insert into public.help_threads (
  owner_user_id, guest_session_hash, owner_email, owner_name, source, status, subject,
  last_message_at, last_user_message_at, last_admin_message_at, created_at, updated_at,
  legacy_contact_message_id
)
select
  c.user_id,
  case when c.user_id is null then encode(digest('legacy-contact:' || c.id::text, 'sha256'), 'hex') else null end,
  c.reply_email,
  c.name,
  'contact',
  case c.status
    when 'new' then 'waiting_admin'
    when 'read' then 'waiting_user'
    when 'archived' then 'archived'
    when 'deleted' then 'archived'
    when 'spam' then 'blocked'
    else 'open'
  end,
  c.subject,
  coalesce(c.updated_at, c.created_at, now()),
  c.created_at,
  null,
  coalesce(c.created_at, now()),
  coalesce(c.updated_at, c.created_at, now()),
  c.id
from public.contact_messages c
on conflict (legacy_contact_message_id) do nothing;

insert into public.help_messages (
  thread_id, sender_type, sender_user_id, public_sender_name, body, body_preview,
  created_at, legacy_contact_message_id
)
select
  t.id,
  'user',
  c.user_id,
  coalesce(nullif(trim(c.name), ''), 'Visitor'),
  coalesce(nullif(trim(c.message_body), ''), '[No message content]'),
  left(coalesce(nullif(regexp_replace(c.message_body, '\\s+', ' ', 'g'), ''), '[No message content]'), 200),
  coalesce(c.created_at, now()),
  c.id
from public.contact_messages c
join public.help_threads t on t.legacy_contact_message_id = c.id
on conflict (legacy_contact_message_id) do nothing;

insert into public.help_messages (
  thread_id, sender_type, sender_user_id, public_sender_name, body, body_preview,
  is_internal_note, created_at, legacy_contact_reply_id
)
select
  t.id,
  r.author_type,
  r.author_user_id,
  case when r.author_type = 'admin' then 'Oriana Wren' else coalesce(nullif(trim(r.public_display_name), ''), 'Visitor') end,
  coalesce(nullif(trim(r.body), ''), '[No message content]'),
  left(coalesce(nullif(regexp_replace(r.body, '\\s+', ' ', 'g'), ''), '[No message content]'), 200),
  coalesce(r.is_internal_note, false),
  coalesce(r.created_at, now()),
  r.id
from public.contact_message_replies r
join public.help_threads t on t.legacy_contact_message_id = r.message_id
on conflict (legacy_contact_reply_id) do nothing;

alter table public.help_threads enable row level security;
alter table public.help_messages enable row level security;

drop policy if exists "Help users read own threads" on public.help_threads;
create policy "Help users read own threads" on public.help_threads for select to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists "Help users create own threads" on public.help_threads;
create policy "Help users create own threads" on public.help_threads for insert to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists "Help users read own messages" on public.help_messages;
create policy "Help users read own messages" on public.help_messages for select to authenticated
  using (
    is_internal_note = false and exists (
      select 1 from public.help_threads
      where help_threads.id = help_messages.thread_id
        and help_threads.owner_user_id = auth.uid()
    )
  );

drop policy if exists "Help users append own messages" on public.help_messages;
create policy "Help users append own messages" on public.help_messages for insert to authenticated
  with check (
    sender_type = 'user'
    and sender_user_id = auth.uid()
    and exists (
      select 1 from public.help_threads
      where help_threads.id = help_messages.thread_id
        and help_threads.owner_user_id = auth.uid()
        and help_threads.status in ('open', 'waiting_admin', 'waiting_user')
    )
  );

-- Admin Studio uses server-side role checks. These policies preserve direct Supabase access for admins.
drop policy if exists "Help admins manage threads" on public.help_threads;
create policy "Help admins manage threads" on public.help_threads for all to authenticated
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role in ('admin', 'founder') and coalesce(is_blocked, false) = false))
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role in ('admin', 'founder') and coalesce(is_blocked, false) = false));

drop policy if exists "Help admins manage messages" on public.help_messages;
create policy "Help admins manage messages" on public.help_messages for all to authenticated
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role in ('admin', 'founder') and coalesce(is_blocked, false) = false))
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role in ('admin', 'founder') and coalesce(is_blocked, false) = false));

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'album_access_granted', 'album_access_revoked', 'access_request_approved', 'access_request_rejected',
    'message_reply', 'account_blocked', 'account_unblocked', 'admin_new_request', 'admin_new_message',
    'help_thread_updated'
  )
);

notify pgrst, 'reload schema';

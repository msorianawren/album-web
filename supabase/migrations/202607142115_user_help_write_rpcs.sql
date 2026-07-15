-- Atomic, ownership-safe user writes for the unified help conversation system.
-- Apply after 202607141000_unified_help_chat.sql. Application cutover is separate.

create or replace function public.create_user_help_thread(
  p_source text,
  p_subject text,
  p_body text,
  p_assistant_intent text default null
)
returns table (
  id uuid,
  source text,
  status text,
  subject text,
  last_message_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  current_name text;
  current_is_blocked boolean := false;
  clean_source text := btrim(coalesce(p_source, ''));
  clean_subject text := nullif(btrim(coalesce(p_subject, '')), '');
  clean_body text := btrim(coalesce(p_body, ''));
  clean_intent text := nullif(btrim(coalesce(p_assistant_intent, '')), '');
  body_preview text;
  created_thread public.help_threads%rowtype;
begin
  if current_user_id is null then
    raise sqlstate 'PT401' using message = 'Authentication required.';
  end if;

  select p.email, p.display_name, coalesce(p.is_blocked, false)
    into current_email, current_name, current_is_blocked
  from public.user_profiles p
  where p.user_id = current_user_id;

  if current_is_blocked then
    raise sqlstate 'PT403' using message = 'This account cannot send messages.';
  end if;

  if clean_source not in ('contact', 'assistant', 'private_access', 'system') then
    raise sqlstate 'PT400' using message = 'Invalid conversation source.';
  end if;
  if clean_subject is not null and char_length(clean_subject) > 200 then
    raise sqlstate 'PT400' using message = 'Conversation subject is too long.';
  end if;
  if char_length(clean_body) < 5 or char_length(clean_body) > 5000 then
    raise sqlstate 'PT400' using message = 'Message length is invalid.';
  end if;
  if clean_intent is not null and char_length(clean_intent) > 80 then
    raise sqlstate 'PT400' using message = 'Assistant intent is too long.';
  end if;

  current_email := coalesce(current_email, auth.jwt() ->> 'email');
  current_name := coalesce(
    nullif(btrim(current_name), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    'Visitor'
  );
  body_preview := left(regexp_replace(clean_body, '\s+', ' ', 'g'), 200);

  insert into public.help_threads (
    owner_user_id,
    owner_email,
    owner_name,
    source,
    subject,
    status,
    last_message_at,
    last_user_message_at
  )
  values (
    current_user_id,
    current_email,
    current_name,
    clean_source,
    clean_subject,
    'waiting_admin',
    statement_timestamp(),
    statement_timestamp()
  )
  returning * into created_thread;

  insert into public.help_messages (
    thread_id,
    sender_type,
    sender_user_id,
    public_sender_name,
    public_sender_avatar_url,
    body,
    body_preview
  )
  values (
    created_thread.id,
    'user',
    current_user_id,
    current_name,
    null,
    clean_body,
    body_preview
  );

  if clean_intent is not null then
    insert into public.help_messages (
      thread_id,
      sender_type,
      public_sender_name,
      body,
      body_preview,
      metadata,
      is_internal_note
    )
    values (
      created_thread.id,
      'system',
      'Oriana Companion',
      'Question came from Oriana Companion.',
      'Assistant handoff',
      jsonb_build_object('intent', clean_intent),
      true
    );
  end if;

  return query
  select
    created_thread.id,
    created_thread.source,
    created_thread.status,
    created_thread.subject,
    created_thread.last_message_at,
    created_thread.created_at;
end;
$$;

create or replace function public.append_user_help_message(
  p_thread_id uuid,
  p_body text
)
returns table (
  id uuid,
  thread_id uuid,
  sender_type text,
  public_sender_name text,
  public_sender_avatar_url text,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_name text;
  current_is_blocked boolean := false;
  clean_body text := btrim(coalesce(p_body, ''));
  body_preview text;
  target_thread public.help_threads%rowtype;
  recent_count integer := 0;
  recent_user_count integer := 0;
  created_message public.help_messages%rowtype;
begin
  if current_user_id is null then
    raise sqlstate 'PT401' using message = 'Authentication required.';
  end if;

  select p.display_name, coalesce(p.is_blocked, false)
    into current_name, current_is_blocked
  from public.user_profiles p
  where p.user_id = current_user_id;

  if current_is_blocked then
    raise sqlstate 'PT403' using message = 'This account cannot send messages.';
  end if;
  if p_thread_id is null then
    raise sqlstate 'PT400' using message = 'Invalid conversation id.';
  end if;
  if char_length(clean_body) < 1 or char_length(clean_body) > 5000 then
    raise sqlstate 'PT400' using message = 'Message length is invalid.';
  end if;

  select t.*
    into target_thread
  from public.help_threads t
  where t.id = p_thread_id
    and t.owner_user_id = current_user_id
  for update;

  if not found then
    raise sqlstate 'PT404' using message = 'Conversation not found.';
  end if;
  if target_thread.status in ('closed', 'archived', 'blocked') then
    raise sqlstate 'PT409' using message = 'This conversation is closed.';
  end if;

  select count(*), count(*) filter (where recent.sender_type = 'user')
    into recent_count, recent_user_count
  from (
    select hm.sender_type
    from public.help_messages hm
    where hm.thread_id = target_thread.id
      and hm.is_internal_note = false
    order by hm.created_at desc, hm.id desc
    limit 10
  ) recent;

  if recent_count = 10 and recent_user_count = recent_count then
    raise sqlstate 'PT429' using message = 'Please wait for Oriana Wren before sending more messages.';
  end if;

  current_name := coalesce(
    nullif(btrim(current_name), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    'Visitor'
  );
  body_preview := left(regexp_replace(clean_body, '\s+', ' ', 'g'), 200);

  insert into public.help_messages (
    thread_id,
    sender_type,
    sender_user_id,
    public_sender_name,
    public_sender_avatar_url,
    body,
    body_preview
  )
  values (
    target_thread.id,
    'user',
    current_user_id,
    current_name,
    null,
    clean_body,
    body_preview
  )
  returning * into created_message;

  update public.help_threads t
  set
    status = 'waiting_admin',
    last_message_at = created_message.created_at,
    last_user_message_at = created_message.created_at,
    updated_at = created_message.created_at
  where t.id = target_thread.id;

  return query
  select
    created_message.id,
    created_message.thread_id,
    created_message.sender_type,
    created_message.public_sender_name,
    created_message.public_sender_avatar_url,
    created_message.body,
    created_message.created_at;
end;
$$;

revoke all on function public.create_user_help_thread(text, text, text, text) from public;
revoke all on function public.create_user_help_thread(text, text, text, text) from anon;
grant execute on function public.create_user_help_thread(text, text, text, text) to authenticated;

revoke all on function public.append_user_help_message(uuid, text) from public;
revoke all on function public.append_user_help_message(uuid, text) from anon;
grant execute on function public.append_user_help_message(uuid, text) to authenticated;

notify pgrst, 'reload schema';

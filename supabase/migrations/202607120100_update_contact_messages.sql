-- Additive migration for secure contact messages table
alter table contact_messages 
  add column if not exists reply_email text,
  add column if not exists inquiry_type text,
  add column if not exists message_preview text,
  add column if not exists message_body text,
  add column if not exists risk_level text default 'low',
  add column if not exists risk_reasons jsonb,
  add column if not exists client_id_hash text,
  add column if not exists ip_hash text,
  add column if not exists user_agent_hash text,
  add column if not exists source_path text,
  add column if not exists referrer text,
  add column if not exists updated_at timestamp with time zone default now(),
  add column if not exists archived_at timestamp with time zone,
  add column if not exists deleted_at timestamp with time zone;

-- Migrate data safely
update contact_messages set reply_email = email where email is not null and reply_email is null;
update contact_messages set message_body = message where message is not null and message_body is null;
update contact_messages set message_preview = substring(message from 1 for 200) where message is not null and message_preview is null;

-- It's generally better to wait before dropping columns in a blue/green deployment,
-- but since this is an immediate update, we drop them to enforce the new schema.
alter table contact_messages drop column email;
alter table contact_messages drop column message;

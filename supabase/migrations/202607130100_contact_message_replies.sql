-- Add reply tracking to contact messages
alter table contact_messages 
  add column if not exists reply_text text,
  add column if not exists replied_at timestamp with time zone,
  add column if not exists replied_by uuid references auth.users(id);

-- Add index for quicker lookups
create index if not exists idx_contact_messages_replied_at on contact_messages(replied_at);

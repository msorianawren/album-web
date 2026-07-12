create table if not exists contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text default 'new',
  created_at timestamp with time zone default now()
);

alter table contact_messages enable row level security;

create policy "Anyone can insert contact messages" 
on contact_messages for insert to public 
with check (true);

create policy "Admins can view and manage contact messages" 
on contact_messages for all to authenticated 
using (auth.jwt() ->> 'role' = 'service_role' or auth.uid() in (select id from profiles where role = 'admin'));
-- Add ordering columns
alter table public.albums
  add column if not exists public_sort_order integer,
  add column if not exists private_sort_order integer,
  add column if not exists updating_sort_order integer,
  add column if not exists order_updated_at timestamptz,
  add column if not exists order_updated_by uuid references auth.users(id) on delete set null;

-- Add indexes for sorting performance
create index if not exists albums_public_sort_idx on public.albums (status, public_sort_order, created_at) where status = 'public';
create index if not exists albums_private_sort_idx on public.albums (status, private_sort_order, created_at) where status = 'private';
create index if not exists albums_updating_sort_idx on public.albums (status, updating_sort_order, created_at) where status = 'updating';

-- Safe backfill for existing albums
do $$
declare
  r record;
begin
  -- Backfill public
  for r in (
    select id, row_number() over (order by created_at desc) * 10 as new_order
    from public.albums
    where status = 'public' and public_sort_order is null
  ) loop
    update public.albums set public_sort_order = r.new_order where id = r.id;
  end loop;

  -- Backfill private
  for r in (
    select id, row_number() over (order by created_at desc) * 10 as new_order
    from public.albums
    where status = 'private' and private_sort_order is null
  ) loop
    update public.albums set private_sort_order = r.new_order where id = r.id;
  end loop;

  -- Backfill updating
  for r in (
    select id, row_number() over (order by created_at desc) * 10 as new_order
    from public.albums
    where status = 'updating' and updating_sort_order is null
  ) loop
    update public.albums set updating_sort_order = r.new_order where id = r.id;
  end loop;
end;
$$;

-- Create RPC for atomic reordering
create or replace function public.reorder_albums(
  p_status text,
  p_album_ids uuid[],
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_index integer := 10;
begin
  -- The API route using service_role should pass the authenticated user id
  if p_user_id is null then
    raise exception 'User ID is required';
  end if;

  if not exists (
    select 1 from public.user_profiles
    where user_id = p_user_id and role in ('admin', 'founder')
  ) then
    raise exception 'Unauthorized';
  end if;

  if p_status not in ('public', 'private', 'updating') then
    raise exception 'Invalid status';
  end if;

  foreach v_id in array p_album_ids
  loop
    if p_status = 'public' then
      update public.albums
      set public_sort_order = v_index,
          order_updated_at = now(),
          order_updated_by = p_user_id
      where id = v_id and status = 'public';
    elsif p_status = 'private' then
      update public.albums
      set private_sort_order = v_index,
          order_updated_at = now(),
          order_updated_by = p_user_id
      where id = v_id and status = 'private';
    elsif p_status = 'updating' then
      update public.albums
      set updating_sort_order = v_index,
          order_updated_at = now(),
          order_updated_by = p_user_id
      where id = v_id and status = 'updating';
    end if;
    
    v_index := v_index + 10;
  end loop;
end;
$$;

-- Create RPC for changing album status safely
create or replace function public.change_album_status(
  p_album_id uuid,
  p_new_status text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_order integer;
begin
  if p_user_id is null then
    raise exception 'User ID is required';
  end if;
  
  if not exists (
    select 1 from public.user_profiles
    where user_id = p_user_id and role in ('admin', 'founder')
  ) then
    raise exception 'Unauthorized';
  end if;
  
  if p_new_status not in ('public', 'private', 'updating') then
    raise exception 'Invalid status';
  end if;

  -- Find the max order in the target status
  if p_new_status = 'public' then
    select coalesce(max(public_sort_order), 0) into v_max_order from public.albums where status = 'public';
    update public.albums
    set status = p_new_status,
        public_sort_order = v_max_order + 10,
        private_sort_order = null,
        updating_sort_order = null,
        updated_at = now()
    where id = p_album_id;
  elsif p_new_status = 'private' then
    select coalesce(max(private_sort_order), 0) into v_max_order from public.albums where status = 'private';
    update public.albums
    set status = p_new_status,
        private_sort_order = v_max_order + 10,
        public_sort_order = null,
        updating_sort_order = null,
        updated_at = now()
    where id = p_album_id;
  elsif p_new_status = 'updating' then
    select coalesce(max(updating_sort_order), 0) into v_max_order from public.albums where status = 'updating';
    update public.albums
    set status = p_new_status,
        updating_sort_order = v_max_order + 10,
        public_sort_order = null,
        private_sort_order = null,
        updated_at = now()
    where id = p_album_id;
  end if;

end;
$$;

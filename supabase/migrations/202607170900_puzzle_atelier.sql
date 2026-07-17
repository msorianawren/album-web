-- Puzzle Atelier: public challenges, verified attempts, and account-only rewards.
create table if not exists public.puzzle_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 1200),
  collection text not null check (collection in ('featured', 'editorial_portraits', 'traditional_elegance', 'travel_stories', 'seasonal')),
  source_type text not null check (source_type in ('album_media', 'game_asset')),
  source_media_id uuid references public.media(id) on delete restrict,
  puzzle_asset_key text,
  preview_asset_key text,
  focal_x numeric(4,3) not null default 0.5 check (focal_x between 0 and 1),
  focal_y numeric(4,3) not null default 0.5 check (focal_y between 0 and 1),
  allowed_modes text[] not null default array['sliding', 'swap']::text[] check (allowed_modes <@ array['sliding', 'swap']::text[] and cardinality(allowed_modes) > 0),
  allowed_grid_sizes integer[] not null default array[3,4,5] check (allowed_grid_sizes <@ array[3,4,5] and cardinality(allowed_grid_sizes) > 0),
  visibility text not null default 'public' check (visibility in ('public', 'members')),
  targets jsonb not null default '{"3":{"seconds":180,"moves":40},"4":{"seconds":360,"moves":110},"5":{"seconds":720,"moves":260}}'::jsonb,
  reward_multiplier numeric(3,2) not null default 1.0 check (reward_multiplier between 0.5 and 2.0),
  base_seed text not null check (char_length(base_seed) between 8 and 160),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint puzzle_challenge_source_check check (
    (source_type = 'album_media' and source_media_id is not null) or
    (source_type = 'game_asset' and puzzle_asset_key is not null)
  )
);

create index if not exists puzzle_challenges_public_index on public.puzzle_challenges (status, visibility, collection, published_at desc);
create index if not exists puzzle_challenges_source_media_index on public.puzzle_challenges (source_media_id) where source_media_id is not null;

create table if not exists public.puzzle_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.puzzle_challenges(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('sliding', 'swap')),
  grid_size integer not null check (grid_size in (3,4,5)),
  seed text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms between 0 and 7200000),
  move_count integer check (move_count is null or move_count between 0 and 10000),
  trace jsonb,
  trace_digest text,
  verified boolean not null default false,
  reward_earned integer not null default 0 check (reward_earned between 0 and 100),
  finalized_at timestamptz
);

create index if not exists puzzle_attempts_user_index on public.puzzle_attempts (user_id, started_at desc);
create index if not exists puzzle_attempts_challenge_index on public.puzzle_attempts (challenge_id, verified, completed_at desc);

create table if not exists public.puzzle_user_results (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.puzzle_challenges(id) on delete restrict,
  mode text not null check (mode in ('sliding', 'swap')),
  grid_size integer not null check (grid_size in (3,4,5)),
  best_time_ms integer,
  best_move_count integer,
  best_reward integer not null default 0 check (best_reward between 0 and 100),
  completion_count integer not null default 0,
  first_completed_at timestamptz,
  last_completed_at timestamptz,
  primary key (user_id, challenge_id, mode, grid_size)
);

create table if not exists public.puzzle_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_feathers integer not null default 0 check (total_feathers >= 0),
  level integer not null default 1 check (level >= 1),
  total_completed integer not null default 0 check (total_completed >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.puzzle_user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null check (badge_key in ('first_assembly', 'sliding_grace', 'perfect_exchange', 'under_one_minute', 'master_5x5', 'puzzle_collector')),
  earned_at timestamptz not null default now(),
  source_challenge_id uuid references public.puzzle_challenges(id) on delete set null,
  primary key (user_id, badge_key)
);

drop trigger if exists puzzle_challenges_set_updated_at on public.puzzle_challenges;
create trigger puzzle_challenges_set_updated_at before update on public.puzzle_challenges
for each row execute function public.set_updated_at();

alter table public.puzzle_challenges enable row level security;
alter table public.puzzle_attempts enable row level security;
alter table public.puzzle_user_results enable row level security;
alter table public.puzzle_user_profiles enable row level security;
alter table public.puzzle_user_badges enable row level security;

revoke all on table public.puzzle_attempts, public.puzzle_user_results, public.puzzle_user_profiles, public.puzzle_user_badges from anon, authenticated;
revoke insert, update, delete on table public.puzzle_challenges from anon, authenticated;
drop policy if exists "published puzzle challenges are readable" on public.puzzle_challenges;
create policy "published puzzle challenges are readable" on public.puzzle_challenges for select using (
  status = 'published' and visibility = 'public'
);

create or replace function public.finalize_puzzle_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_elapsed_ms integer,
  p_move_count integer,
  p_trace jsonb,
  p_trace_digest text,
  p_qualified_reward integer
) returns table(reward_earned integer, total_feathers integer, completion_count integer)
language plpgsql security definer set search_path = public as $$
declare
  attempt public.puzzle_attempts%rowtype;
  previous public.puzzle_user_results%rowtype;
  next_reward integer;
  earned integer;
  now_value timestamptz := now();
  first_completion boolean := false;
begin
  select * into attempt from public.puzzle_attempts where id = p_attempt_id and user_id = p_user_id for update;
  if not found then raise exception 'puzzle attempt not found'; end if;
  if attempt.finalized_at is not null then
    return query select attempt.reward_earned,
      coalesce((select total_feathers from public.puzzle_user_profiles where user_id = p_user_id), 0),
      coalesce((select completion_count from public.puzzle_user_results where user_id = p_user_id and challenge_id = attempt.challenge_id and mode = attempt.mode and grid_size = attempt.grid_size), 0);
    return;
  end if;

  select * into previous from public.puzzle_user_results
    where user_id = p_user_id and challenge_id = attempt.challenge_id and mode = attempt.mode and grid_size = attempt.grid_size for update;
  first_completion := not found;
  next_reward := least(100, greatest(5, p_qualified_reward + case when first_completion then 10 else 0 end));
  earned := greatest(0, next_reward - coalesce(previous.best_reward, 0));

  insert into public.puzzle_user_results (user_id, challenge_id, mode, grid_size, best_time_ms, best_move_count, best_reward, completion_count, first_completed_at, last_completed_at)
  values (p_user_id, attempt.challenge_id, attempt.mode, attempt.grid_size, p_elapsed_ms, p_move_count, next_reward, 1, now_value, now_value)
  on conflict (user_id, challenge_id, mode, grid_size) do update set
    best_time_ms = case when excluded.best_time_ms < puzzle_user_results.best_time_ms then excluded.best_time_ms else puzzle_user_results.best_time_ms end,
    best_move_count = case when excluded.best_move_count < puzzle_user_results.best_move_count then excluded.best_move_count else puzzle_user_results.best_move_count end,
    best_reward = greatest(puzzle_user_results.best_reward, excluded.best_reward),
    completion_count = puzzle_user_results.completion_count + 1,
    last_completed_at = now_value;

  insert into public.puzzle_user_profiles (user_id, total_feathers, level, total_completed, updated_at)
  values (p_user_id, earned, greatest(1, floor(earned / 100.0)::integer + 1), 1, now_value)
  on conflict (user_id) do update set
    total_feathers = puzzle_user_profiles.total_feathers + earned,
    level = greatest(1, floor((puzzle_user_profiles.total_feathers + earned) / 100.0)::integer + 1),
    total_completed = puzzle_user_profiles.total_completed + 1,
    updated_at = now_value;

  update public.puzzle_attempts set
    completed_at = now_value, elapsed_ms = p_elapsed_ms, move_count = p_move_count,
    trace = p_trace, trace_digest = p_trace_digest, verified = true,
    reward_earned = earned, finalized_at = now_value
  where id = p_attempt_id;

  return query select earned,
    (select total_feathers from public.puzzle_user_profiles where user_id = p_user_id),
    (select completion_count from public.puzzle_user_results where user_id = p_user_id and challenge_id = attempt.challenge_id and mode = attempt.mode and grid_size = attempt.grid_size);
end;
$$;

revoke all on function public.finalize_puzzle_attempt(uuid, uuid, integer, integer, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.finalize_puzzle_attempt(uuid, uuid, integer, integer, jsonb, text, integer) to service_role;

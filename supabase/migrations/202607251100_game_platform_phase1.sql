-- Generic game platform foundation. This migration does not cut over Puzzle Atelier.
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  engine_key text not null check (char_length(engine_key) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  visibility text not null default 'public' check (visibility in ('public', 'members')),
  legacy_source text,
  published_version_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_versions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete restrict,
  version integer not null check (version > 0),
  schema_version integer not null default 1 check (schema_version > 0),
  engine_version text not null check (char_length(engine_version) between 1 and 80),
  content_digest text not null check (content_digest ~ '^[0-9a-f]{64}$'),
  config jsonb not null default '{}'::jsonb,
  verification_config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (game_id, version),
  unique (id, game_id)
);

alter table public.games
  add constraint games_published_version_fk
  foreign key (published_version_id, id)
  references public.game_versions(id, game_id) on delete restrict;

create table if not exists public.game_difficulties (
  id uuid primary key default gen_random_uuid(),
  game_version_id uuid not null references public.game_versions(id) on delete restrict,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  label text not null check (char_length(label) between 1 and 80),
  ordinal integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  unique (game_version_id, key),
  unique (id, game_version_id)
);

create table if not exists public.game_assets (
  id uuid primary key default gen_random_uuid(),
  game_version_id uuid not null references public.game_versions(id) on delete restrict,
  asset_key text not null check (asset_key !~ '(^https?://|\\.\\.)'),
  kind text not null check (kind in ('image', 'audio', 'data')),
  object_key text not null check (object_key !~ '(^https?://|\\.\\.)'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  is_public boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (game_version_id, asset_key)
);

create table if not exists public.game_content_items (
  id uuid primary key default gen_random_uuid(),
  game_version_id uuid not null references public.game_versions(id) on delete restrict,
  difficulty_id uuid,
  content_key text not null,
  payload jsonb not null default '{}'::jsonb,
  ordinal integer not null default 0,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  unique (game_version_id, content_key),
  foreign key (difficulty_id, game_version_id)
    references public.game_difficulties(id, game_version_id) on delete restrict
);

create table if not exists public.game_tutorials (
  id uuid primary key default gen_random_uuid(),
  game_version_id uuid not null references public.game_versions(id) on delete restrict,
  locale text not null default 'en',
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  created_at timestamptz not null default now(),
  unique (game_version_id, locale)
);

create table if not exists public.game_mascot_profiles (
  id uuid primary key default gen_random_uuid(),
  game_version_id uuid not null references public.game_versions(id) on delete restrict,
  profile_key text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (game_version_id, profile_key)
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  game_id uuid not null references public.games(id) on delete restrict,
  game_version_id uuid not null,
  difficulty_id uuid not null,
  seed text not null check (char_length(seed) between 16 and 256),
  nonce_hash text not null check (nonce_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'started' check (status in ('started', 'finalized', 'expired', 'invalid')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  finalized_at timestamptz,
  client_version text,
  metadata jsonb not null default '{}'::jsonb,
  unique (id, user_id),
  foreign key (game_version_id, game_id)
    references public.game_versions(id, game_id) on delete restrict,
  foreign key (difficulty_id, game_version_id)
    references public.game_difficulties(id, game_version_id) on delete restrict,
  check (expires_at > started_at)
);

create table if not exists public.game_reward_policies (
  id uuid primary key default gen_random_uuid(),
  game_version_id uuid not null references public.game_versions(id) on delete restrict,
  difficulty_id uuid not null,
  base_reward integer not null check (base_reward between 0 and 100000),
  maximum_reward integer not null check (maximum_reward between 0 and 100000),
  repeat_multiplier_bps integer not null default 2500 check (repeat_multiplier_bps between 0 and 10000),
  daily_cap integer not null check (daily_cap between 0 and 100000),
  active_from timestamptz not null default now(),
  active_until timestamptz,
  created_at timestamptz not null default now(),
  unique (game_version_id, difficulty_id),
  foreign key (difficulty_id, game_version_id)
    references public.game_difficulties(id, game_version_id) on delete restrict,
  check (maximum_reward >= base_reward),
  check (active_until is null or active_until > active_from)
);

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  game_id uuid not null references public.games(id) on delete restrict,
  game_version_id uuid not null references public.game_versions(id) on delete restrict,
  difficulty_id uuid not null references public.game_difficulties(id) on delete restrict,
  reward_policy_id uuid not null references public.game_reward_policies(id) on delete restrict,
  score integer not null check (score >= 0),
  duration_ticks integer not null check (duration_ticks > 0),
  replay jsonb not null,
  replay_digest text not null check (replay_digest ~ '^[0-9a-f]{64}$'),
  reward_granted integer not null default 0 check (reward_granted >= 0),
  verification jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.game_sessions(id, user_id) on delete restrict
);

create table if not exists public.game_user_stats (
  user_id uuid not null references auth.users(id) on delete restrict,
  game_id uuid not null references public.games(id) on delete restrict,
  difficulty_id uuid not null references public.game_difficulties(id) on delete restrict,
  completion_count integer not null default 0 check (completion_count >= 0),
  best_score integer not null default 0 check (best_score >= 0),
  best_duration_ticks integer,
  total_reward integer not null default 0 check (total_reward >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id, difficulty_id)
);

create table if not exists public.game_achievements (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete restrict,
  key text not null,
  title text not null,
  description text not null default '',
  criteria jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  unique (game_id, key)
);

create table if not exists public.game_user_achievements (
  user_id uuid not null references auth.users(id) on delete restrict,
  achievement_id uuid not null references public.game_achievements(id) on delete restrict,
  result_id uuid references public.game_results(id) on delete restrict,
  earned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, achievement_id)
);

create table if not exists public.game_daily_reward_usage (
  user_id uuid not null references auth.users(id) on delete restrict,
  game_id uuid not null references public.games(id) on delete restrict,
  reward_date date not null,
  granted integer not null default 0 check (granted >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id, reward_date)
);

create table if not exists public.game_leaderboards (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null unique references public.game_results(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  game_version_id uuid not null references public.game_versions(id) on delete restrict,
  difficulty_id uuid not null references public.game_difficulties(id) on delete restrict,
  score integer not null check (score >= 0),
  duration_ticks integer not null check (duration_ticks > 0),
  period_key text not null default 'all-time',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.game_platform_settings (
  id boolean primary key default true check (id),
  public_config jsonb not null default '{}'::jsonb,
  private_config jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_runtime_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (char_length(event_type) between 1 and 80),
  tick integer check (tick is null or tick >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.game_migration_map (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id text not null,
  target_table text not null,
  target_id uuid,
  status text not null default 'inventoried' check (status in ('inventoried', 'mapped', 'verified', 'rolled_back')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_table, source_id, target_table)
);

alter table public.wren_feather_ledger
  add column game_result_id uuid unique references public.game_results(id) on delete restrict;

alter table public.wren_feather_ledger
  drop constraint if exists wren_feather_ledger_event_type_check;

alter table public.wren_feather_ledger
  add constraint wren_feather_ledger_event_type_check
  check (event_type in ('album_purchase', 'game_reward'));

create or replace function public.prevent_published_game_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'published' then
    raise exception 'PUBLISHED_GAME_VERSION_IMMUTABLE';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger game_versions_published_immutable
before update or delete on public.game_versions
for each row execute function public.prevent_published_game_version_mutation();

create or replace function public.prevent_published_game_content_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_version_id uuid := (v_row ->> 'game_version_id')::uuid;
begin
  if exists (
    select 1 from public.game_versions as version_row
    where version_row.id = v_version_id and version_row.status = 'published'
  ) then
    raise exception 'PUBLISHED_GAME_CONTENT_IMMUTABLE';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger game_difficulties_published_immutable
before insert or update or delete on public.game_difficulties
for each row execute function public.prevent_published_game_content_mutation();
create trigger game_assets_published_immutable
before insert or update or delete on public.game_assets
for each row execute function public.prevent_published_game_content_mutation();
create trigger game_content_items_published_immutable
before insert or update or delete on public.game_content_items
for each row execute function public.prevent_published_game_content_mutation();
create trigger game_tutorials_published_immutable
before insert or update or delete on public.game_tutorials
for each row execute function public.prevent_published_game_content_mutation();
create trigger game_mascot_profiles_published_immutable
before insert or update or delete on public.game_mascot_profiles
for each row execute function public.prevent_published_game_content_mutation();
create trigger game_reward_policies_published_immutable
before insert or update or delete on public.game_reward_policies
for each row execute function public.prevent_published_game_content_mutation();

create or replace function public.finalize_game_session_v1(
  p_session_id uuid,
  p_user_id uuid,
  p_nonce text,
  p_replay jsonb,
  p_replay_digest text,
  p_duration_ticks integer,
  p_score integer,
  p_verification jsonb
) returns table(
  result_id uuid,
  reward_granted integer,
  balance_after integer,
  duplicate boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session public.game_sessions%rowtype;
  v_version public.game_versions%rowtype;
  v_policy public.game_reward_policies%rowtype;
  v_existing public.game_results%rowtype;
  v_completion_count integer;
  v_daily_granted integer;
  v_calculated integer;
  v_reward integer;
  v_balance integer;
  v_result_id uuid;
  v_today date := (now() at time zone 'utc')::date;
begin
  if p_user_id is null or p_nonce is null or char_length(p_nonce) < 16 then
    raise exception 'INVALID_SESSION_CREDENTIALS';
  end if;
  if p_replay is null
     or p_replay_digest !~ '^[0-9a-f]{64}$'
     or p_duration_ticks < 1
     or p_score < 0
     or jsonb_typeof(p_replay) <> 'object' then
    raise exception 'INVALID_REPLAY';
  end if;

  select session_row.* into v_session
  from public.game_sessions as session_row
  where session_row.id = p_session_id and session_row.user_id = p_user_id
  for update;
  if not found then raise exception 'GAME_SESSION_NOT_FOUND'; end if;

  if v_session.status = 'finalized' then
    select result_row.* into v_existing
    from public.game_results as result_row
    where result_row.session_id = v_session.id;
    if not found then raise exception 'FINALIZED_SESSION_MISSING_RESULT'; end if;
    select profile.total_feathers into v_balance
    from public.puzzle_user_profiles as profile
    where profile.user_id = p_user_id;
    return query select v_existing.id, v_existing.reward_granted, coalesce(v_balance, 0), true;
    return;
  end if;

  if v_session.status <> 'started' or v_session.expires_at <= now() then
    update public.game_sessions
    set status = case when status = 'started' then 'expired' else status end
    where id = v_session.id;
    raise exception 'GAME_SESSION_EXPIRED';
  end if;
  if encode(digest(p_nonce, 'sha256'), 'hex') <> v_session.nonce_hash then
    raise exception 'INVALID_SESSION_NONCE';
  end if;

  select version_row.* into v_version
  from public.game_versions as version_row
  where version_row.id = v_session.game_version_id;
  if not found or v_version.status <> 'published' or v_version.published_at is null then
    raise exception 'GAME_VERSION_NOT_PUBLISHED';
  end if;
  if coalesce((p_verification ->> 'valid')::boolean, false) is not true
     or p_verification ->> 'version_id' <> v_version.id::text
     or p_verification ->> 'replay_digest' <> p_replay_digest then
    raise exception 'REPLAY_VERIFICATION_REJECTED';
  end if;

  select policy.* into v_policy
  from public.game_reward_policies as policy
  where policy.game_version_id = v_session.game_version_id
    and policy.difficulty_id = v_session.difficulty_id
    and policy.active_from <= now()
    and (policy.active_until is null or policy.active_until > now())
  for update;
  if not found then raise exception 'GAME_REWARD_POLICY_NOT_FOUND'; end if;

  select count(*)::integer into v_completion_count
  from public.game_results as prior
  where prior.user_id = p_user_id
    and prior.game_id = v_session.game_id
    and prior.difficulty_id = v_session.difficulty_id;

  insert into public.game_daily_reward_usage (user_id, game_id, reward_date)
  values (p_user_id, v_session.game_id, v_today)
  on conflict (user_id, game_id, reward_date) do nothing;

  select usage.granted into v_daily_granted
  from public.game_daily_reward_usage as usage
  where usage.user_id = p_user_id
    and usage.game_id = v_session.game_id
    and usage.reward_date = v_today
  for update;

  v_calculated := floor(
    v_policy.base_reward
    * (case when v_completion_count > 0 then v_policy.repeat_multiplier_bps else 10000 end)
    / 10000.0
  )::integer;
  v_reward := least(
    v_policy.maximum_reward,
    greatest(0, v_calculated),
    greatest(0, v_policy.daily_cap - coalesce(v_daily_granted, 0))
  );

  insert into public.game_results (
    session_id, user_id, game_id, game_version_id, difficulty_id,
    reward_policy_id, score, duration_ticks, replay, replay_digest,
    reward_granted, verification
  ) values (
    v_session.id, p_user_id, v_session.game_id, v_session.game_version_id,
    v_session.difficulty_id, v_policy.id, p_score, p_duration_ticks,
    p_replay, p_replay_digest, v_reward, p_verification
  ) returning id into v_result_id;

  insert into public.puzzle_user_profiles (user_id, total_feathers, level, total_completed, updated_at)
  values (
    p_user_id,
    v_reward,
    greatest(1, floor(v_reward / 100.0)::integer + 1),
    1,
    now()
  )
  on conflict (user_id) do update set
    total_feathers = public.puzzle_user_profiles.total_feathers + v_reward,
    level = greatest(1, floor((public.puzzle_user_profiles.total_feathers + v_reward) / 100.0)::integer + 1),
    total_completed = public.puzzle_user_profiles.total_completed + 1,
    updated_at = now()
  returning total_feathers into v_balance;

  if v_reward > 0 then
    insert into public.wren_feather_ledger (
      user_id, delta, event_type, game_result_id, balance_after, metadata
    ) values (
      p_user_id, v_reward, 'game_reward', v_result_id, v_balance,
      jsonb_build_object('source', 'finalize_game_session_v1', 'game_id', v_session.game_id)
    );
  end if;

  update public.game_daily_reward_usage
  set granted = granted + v_reward, updated_at = now()
  where user_id = p_user_id and game_id = v_session.game_id and reward_date = v_today;

  insert into public.game_user_stats (
    user_id, game_id, difficulty_id, completion_count, best_score,
    best_duration_ticks, total_reward, updated_at
  ) values (
    p_user_id, v_session.game_id, v_session.difficulty_id, 1, p_score,
    p_duration_ticks, v_reward, now()
  )
  on conflict (user_id, game_id, difficulty_id) do update set
    completion_count = public.game_user_stats.completion_count + 1,
    best_score = greatest(public.game_user_stats.best_score, excluded.best_score),
    best_duration_ticks = case
      when public.game_user_stats.best_duration_ticks is null then excluded.best_duration_ticks
      else least(public.game_user_stats.best_duration_ticks, excluded.best_duration_ticks)
    end,
    total_reward = public.game_user_stats.total_reward + excluded.total_reward,
    updated_at = now();

  update public.game_sessions
  set status = 'finalized', finalized_at = now()
  where id = v_session.id;

  insert into public.audit_logs (
    actor_user_id, action, target_type, target_id, metadata
  ) values (
    p_user_id, 'game_session_finalized', 'game_result', v_result_id::text,
    jsonb_build_object('game_id', v_session.game_id, 'reward', v_reward)
  );

  return query select v_result_id, v_reward, v_balance, false;
end;
$$;

revoke all on function public.finalize_game_session_v1(
  uuid, uuid, text, jsonb, text, integer, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.finalize_game_session_v1(
  uuid, uuid, text, jsonb, text, integer, integer, jsonb
) to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'games', 'game_versions', 'game_difficulties', 'game_assets',
    'game_content_items', 'game_tutorials', 'game_mascot_profiles',
    'game_sessions', 'game_results', 'game_user_stats', 'game_achievements',
    'game_user_achievements', 'game_reward_policies', 'game_daily_reward_usage',
    'game_leaderboards', 'game_platform_settings', 'game_runtime_events',
    'game_migration_map'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

grant select on public.games, public.game_versions, public.game_difficulties,
  public.game_assets, public.game_content_items, public.game_tutorials,
  public.game_mascot_profiles, public.game_reward_policies,
  public.game_achievements, public.game_leaderboards
to anon, authenticated;
grant select on public.game_sessions, public.game_results, public.game_user_stats,
  public.game_user_achievements, public.game_daily_reward_usage,
  public.game_runtime_events
to authenticated;

create policy "published games are readable" on public.games for select
using (status = 'published' and visibility = 'public');
create policy "published game versions are readable" on public.game_versions for select
using (status = 'published' and published_at is not null and exists (
  select 1 from public.games as game_row
  where game_row.id = game_id
    and game_row.status = 'published'
    and game_row.visibility = 'public'
));
create policy "published game difficulties are readable" on public.game_difficulties for select
using (active and exists (
  select 1
  from public.game_versions as version_row
  join public.games as game_row on game_row.id = version_row.game_id
  where version_row.id = game_version_id
    and version_row.status = 'published'
    and game_row.status = 'published'
    and game_row.visibility = 'public'
));
create policy "published public game assets are readable" on public.game_assets for select
using (is_public and exists (
  select 1
  from public.game_versions as version_row
  join public.games as game_row on game_row.id = version_row.game_id
  where version_row.id = game_version_id
    and version_row.status = 'published'
    and game_row.status = 'published'
    and game_row.visibility = 'public'
));
create policy "published game content is readable" on public.game_content_items for select
using (status = 'active' and exists (
  select 1
  from public.game_versions as version_row
  join public.games as game_row on game_row.id = version_row.game_id
  where version_row.id = game_version_id
    and version_row.status = 'published'
    and game_row.status = 'published'
    and game_row.visibility = 'public'
));
create policy "published game tutorials are readable" on public.game_tutorials for select
using (exists (
  select 1
  from public.game_versions as version_row
  join public.games as game_row on game_row.id = version_row.game_id
  where version_row.id = game_version_id
    and version_row.status = 'published'
    and game_row.status = 'published'
    and game_row.visibility = 'public'
));
create policy "published mascot profiles are readable" on public.game_mascot_profiles for select
using (exists (
  select 1
  from public.game_versions as version_row
  join public.games as game_row on game_row.id = version_row.game_id
  where version_row.id = game_version_id
    and version_row.status = 'published'
    and game_row.status = 'published'
    and game_row.visibility = 'public'
));
create policy "published reward policies are readable" on public.game_reward_policies for select
using (exists (
  select 1
  from public.game_versions as version_row
  join public.games as game_row on game_row.id = version_row.game_id
  where version_row.id = game_version_id
    and version_row.status = 'published'
    and game_row.status = 'published'
    and game_row.visibility = 'public'
));
create policy "active achievements are readable" on public.game_achievements for select
using (status = 'active' and exists (
  select 1 from public.games as game_row
  where game_row.id = game_id
    and game_row.status = 'published'
    and game_row.visibility = 'public'
));
create policy "public leaderboard entries are readable" on public.game_leaderboards for select
using (is_public and exists (
  select 1
  from public.game_versions as version_row
  join public.games as game_row on game_row.id = version_row.game_id
  where version_row.id = game_version_id
    and version_row.status = 'published'
    and game_row.status = 'published'
    and game_row.visibility = 'public'
));
create policy "users read own game sessions" on public.game_sessions for select
using (user_id = (select auth.uid()));
create policy "users read own game results" on public.game_results for select
using (user_id = (select auth.uid()));
create policy "users read own game stats" on public.game_user_stats for select
using (user_id = (select auth.uid()));
create policy "users read own game achievements" on public.game_user_achievements for select
using (user_id = (select auth.uid()));
create policy "users read own daily reward usage" on public.game_daily_reward_usage for select
using (user_id = (select auth.uid()));
create policy "users read own runtime events" on public.game_runtime_events for select
using (user_id = (select auth.uid()));

insert into public.games (
  id, slug, title, description, engine_key, status, visibility, legacy_source
) values (
  '00000000-0000-4000-8000-000000000001',
  'puzzle-atelier',
  'Puzzle Atelier',
  'Legacy Puzzle Atelier registration. No traffic is cut over by this migration.',
  'legacy-puzzle-atelier',
  'draft',
  'public',
  'puzzle_challenges'
);

insert into public.game_versions (
  id, game_id, version, schema_version, engine_version, content_digest,
  config, verification_config, status
) values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  1, 1, 'legacy-1',
  encode(digest('puzzle-atelier-legacy-v1', 'sha256'), 'hex'),
  '{"migration":"inventory-only"}'::jsonb,
  '{"verifier":"legacy-puzzle"}'::jsonb,
  'draft'
);

insert into public.game_difficulties (
  id, game_version_id, key, label, ordinal, config
) values (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000002',
  'legacy', 'Legacy modes', 0, '{"source":"puzzle_challenges"}'::jsonb
);

insert into public.game_migration_map (
  source_table, source_id, target_table, target_id, status, metadata
) values
  ('puzzle_challenges', '*', 'games', '00000000-0000-4000-8000-000000000001', 'inventoried', '{"cutover":false}'::jsonb),
  ('puzzle_attempts', '*', 'game_sessions', null, 'inventoried', '{"cutover":false}'::jsonb),
  ('puzzle_user_results', '*', 'game_results', null, 'inventoried', '{"cutover":false}'::jsonb),
  ('puzzle_user_profiles', '*', 'game_user_stats', null, 'inventoried', '{"cutover":false}'::jsonb),
  ('puzzle_user_badges', '*', 'game_user_achievements', null, 'inventoried', '{"cutover":false}'::jsonb);

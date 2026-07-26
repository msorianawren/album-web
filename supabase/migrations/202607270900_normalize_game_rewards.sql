-- Normalize rewards by verified score so each game and difficulty uses a comparable target.

begin;

alter table public.game_reward_policies
  add column if not exists score_target integer not null default 1 check (score_target > 0);

do $$
declare
  game_row record;
  difficulty_row record;
  new_version_id uuid;
  new_difficulty_id uuid;
  base_amount integer;
  maximum_amount integer;
  target_score integer;
begin
  for game_row in
    select game.id as game_id, game.slug, version.id as source_version_id, version.version, version.schema_version, version.engine_version, version.content_digest, version.config, version.verification_config
    from public.games as game
    join public.game_versions as version on version.id = game.published_version_id
    where game.slug in ('snake', 'feather-merge', 'memory-garden', 'quiet-meadow', 'echo-chimes', 'wren-flight', 'zen-cairn')
  loop
    new_version_id := gen_random_uuid();
    insert into public.game_versions (id, game_id, version, schema_version, engine_version, content_digest, config, verification_config, status)
    values (
      new_version_id,
      game_row.game_id,
      (select coalesce(max(existing.version), 0) + 1 from public.game_versions as existing where existing.game_id = game_row.game_id),
      game_row.schema_version,
      game_row.engine_version,
      game_row.content_digest,
      game_row.config,
      game_row.verification_config,
      'draft'
    );

    for difficulty_row in select * from public.game_difficulties where game_version_id = game_row.source_version_id loop
      new_difficulty_id := gen_random_uuid();
      base_amount := case when game_row.slug = 'quiet-meadow' and difficulty_row.key = 'garden' then 18 when game_row.slug = 'quiet-meadow' and difficulty_row.key = 'wildfield' then 24 else 12 end;
      maximum_amount := case when game_row.slug = 'quiet-meadow' and difficulty_row.key = 'meadow' then 24 when game_row.slug = 'quiet-meadow' and difficulty_row.key = 'garden' then 36 when game_row.slug = 'quiet-meadow' and difficulty_row.key = 'wildfield' then 48 else 30 end;
      target_score := case game_row.slug
        when 'snake' then 180 when 'feather-merge' then 2000 when 'memory-garden' then 1000
        when 'echo-chimes' then 8 when 'wren-flight' then 30 when 'zen-cairn' then 24
        when 'quiet-meadow' then case difficulty_row.key when 'meadow' then 71 when 'garden' then 124 else 216 end else 1 end;
      insert into public.game_difficulties (id, game_version_id, key, label, ordinal, config, active)
      values (new_difficulty_id, new_version_id, difficulty_row.key, difficulty_row.label, difficulty_row.ordinal, difficulty_row.config, difficulty_row.active);
      insert into public.game_reward_policies (game_version_id, difficulty_id, base_reward, maximum_reward, repeat_multiplier_bps, daily_cap, score_target, active_from)
      values (new_version_id, new_difficulty_id, base_amount, maximum_amount, 2500, case when game_row.slug = 'quiet-meadow' then 72 else 90 end, target_score, now());
    end loop;
    update public.game_versions set status = 'published', published_at = now() where id = new_version_id;
    update public.games set published_version_id = new_version_id where id = game_row.game_id;
  end loop;
end;
$$;

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
  v_progress numeric;
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

  if p_score <= 0 then
    raise exception 'NON_QUALIFYING_SCORE';
  end if;
  v_progress := least(1::numeric, p_score::numeric / v_policy.score_target);
  v_calculated := floor((
    v_policy.base_reward + (v_policy.maximum_reward - v_policy.base_reward) * sqrt(v_progress)
  ) * (case when v_completion_count > 0 then v_policy.repeat_multiplier_bps else 10000 end) / 10000.0)::integer;
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

commit;

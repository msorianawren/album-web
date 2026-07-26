-- Normalize rewards by verified score so each game and difficulty uses a comparable target.

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
    values (new_version_id, game_row.game_id, game_row.version + 1, game_row.schema_version, game_row.engine_version, game_row.content_digest, game_row.config, game_row.verification_config, 'draft');

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

do $$
declare
  definition text;
begin
  select pg_get_functiondef(
    'public.finalize_game_session_v1(uuid,uuid,text,jsonb,text,integer,integer,jsonb)'::regprocedure
  ) into definition;

  definition := replace(definition,
    '  v_balance integer;' || chr(10) || '  v_result_id uuid;',
    '  v_balance integer;' || chr(10) || '  v_progress numeric;' || chr(10) || '  v_result_id uuid;'
  );
  definition := replace(definition,
    '  v_calculated := floor(' || chr(10) ||
    '    v_policy.base_reward' || chr(10) ||
    '    * (case when v_completion_count > 0 then v_policy.repeat_multiplier_bps else 10000 end)' || chr(10) ||
    '    / 10000.0' || chr(10) ||
    '  )::integer;' || chr(10) ||
    '  v_reward := least(' || chr(10) ||
    '    v_policy.maximum_reward,' || chr(10) ||
    '    greatest(0, v_calculated),' || chr(10) ||
    '    greatest(0, v_policy.daily_cap - coalesce(v_daily_granted, 0))' || chr(10) ||
    '  );',
    '  if p_score <= 0 then raise exception ''NON_QUALIFYING_SCORE''; end if;' || chr(10) ||
    '  v_progress := least(1::numeric, p_score::numeric / v_policy.score_target);' || chr(10) ||
    '  v_calculated := floor((' || chr(10) ||
    '    v_policy.base_reward + (v_policy.maximum_reward - v_policy.base_reward) * sqrt(v_progress)' || chr(10) ||
    '  ) * (case when v_completion_count > 0 then v_policy.repeat_multiplier_bps else 10000 end) / 10000.0)::integer;' || chr(10) ||
    '  v_reward := least(v_policy.maximum_reward, greatest(0, v_calculated), greatest(0, v_policy.daily_cap - coalesce(v_daily_granted, 0)));'
  );

  if position('v_progress numeric' in definition) = 0 or position('NON_QUALIFYING_SCORE' in definition) = 0 then
    raise exception 'REWARD_FUNCTION_SIGNATURE_CHANGED';
  end if;
  execute definition;
end;
$$;

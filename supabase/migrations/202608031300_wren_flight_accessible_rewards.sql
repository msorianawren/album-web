-- Make Wren Flight's verified reward target match its more forgiving flight model.

do $$
declare
  v_game_id uuid;
  v_source_version public.game_versions%rowtype;
  v_source_difficulty public.game_difficulties%rowtype;
  v_source_policy public.game_reward_policies%rowtype;
  v_new_version_id uuid := gen_random_uuid();
  v_new_difficulty_id uuid := gen_random_uuid();
begin
  select id into v_game_id from public.games where slug = 'wren-flight';
  if not found then raise exception 'WREN_FLIGHT_GAME_NOT_FOUND'; end if;

  select * into v_source_version
  from public.game_versions
  where id = (select published_version_id from public.games where id = v_game_id);
  if not found then raise exception 'WREN_FLIGHT_PUBLISHED_VERSION_NOT_FOUND'; end if;

  select * into v_source_difficulty
  from public.game_difficulties
  where game_version_id = v_source_version.id and key = 'standard';
  if not found then raise exception 'WREN_FLIGHT_STANDARD_DIFFICULTY_NOT_FOUND'; end if;

  select * into v_source_policy
  from public.game_reward_policies
  where game_version_id = v_source_version.id
    and difficulty_id = v_source_difficulty.id
    and active_from <= now()
    and (active_until is null or active_until > now());
  if found and v_source_policy.score_target <= 8 then return; end if;

  insert into public.game_versions (
    id, game_id, version, schema_version, engine_version, content_digest,
    config, verification_config, status
  ) values (
    v_new_version_id, v_game_id,
    (select coalesce(max(existing.version), 0) + 1 from public.game_versions as existing where existing.game_id = v_game_id),
    v_source_version.schema_version, v_source_version.engine_version,
    v_source_version.content_digest, v_source_version.config,
    v_source_version.verification_config, 'draft'
  );

  insert into public.game_difficulties (
    id, game_version_id, key, label, ordinal, config, active
  ) values (
    v_new_difficulty_id, v_new_version_id, v_source_difficulty.key,
    v_source_difficulty.label, v_source_difficulty.ordinal,
    v_source_difficulty.config, v_source_difficulty.active
  );

  insert into public.game_reward_policies (
    game_version_id, difficulty_id, base_reward, maximum_reward,
    repeat_multiplier_bps, daily_cap, score_target, active_from
  ) values (
    v_new_version_id, v_new_difficulty_id, 12, 30, 2500, 90, 8, now()
  );

  update public.game_versions
  set status = 'published', published_at = now()
  where id = v_new_version_id;

  update public.games
  set published_version_id = v_new_version_id
  where id = v_game_id;
end;
$$;

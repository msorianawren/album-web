-- Game Hub Rewards: Echo Chimes, Wren Flight, Zen Cairn Configuration

do $$
declare
  -- Echo Chimes
  v_echo_id uuid := '00000000-0000-4000-8000-000000000050';
  v_echo_version_id uuid := gen_random_uuid();
  v_echo_diff_id uuid := gen_random_uuid();

  -- Wren Flight
  v_flight_id uuid := '00000000-0000-4000-8000-000000000060';
  v_flight_version_id uuid := gen_random_uuid();
  v_flight_diff_id uuid := gen_random_uuid();

  -- Zen Cairn
  v_cairn_id uuid := '00000000-0000-4000-8000-000000000070';
  v_cairn_version_id uuid := gen_random_uuid();
  v_cairn_diff_id uuid := gen_random_uuid();

begin

  -------------------------------------------------------
  -- ECHO CHIMES
  -------------------------------------------------------
  insert into public.games (
    id, slug, title, description, engine_key, status, visibility
  ) values (
    v_echo_id, 'echo-chimes', 'Echo Chimes',
    'Listen to the wind chimes and repeat their delicate melody.',
    'echo-chimes-v1', 'published', 'public'
  ) on conflict (slug) do update
    set title = excluded.title,
        description = excluded.description,
        status = excluded.status;

  select id into v_echo_id from public.games where slug = 'echo-chimes';

  insert into public.game_versions (
    id, game_id, version, schema_version, engine_version,
    content_digest, config, verification_config, status
  ) values (
    v_echo_version_id, v_echo_id, 1, 1, 'echo-chimes-v1',
    '0000000000000000000000000000000000000000000000000000000000000000',
    jsonb_build_object('chimes', 4, 'quality', jsonb_build_array('low', 'balanced', 'high')),
    jsonb_build_object('registered', true, 'mode', 'verified'),
    'draft'
  );

  insert into public.game_difficulties (
    id, game_version_id, key, label, ordinal, config, active
  ) values (
    v_echo_diff_id, v_echo_version_id, 'standard', 'Standard', 0,
    jsonb_build_object('targetSequenceLength', 8),
    true
  );

  insert into public.game_reward_policies (
    game_version_id, difficulty_id, base_reward, maximum_reward,
    repeat_multiplier_bps, daily_cap, active_from
  ) values (
    v_echo_version_id, v_echo_diff_id, 20, 40, 2500, 120, now()
  );

  update public.game_versions set status = 'published', published_at = now()
  where id = v_echo_version_id;

  update public.games set published_version_id = v_echo_version_id
  where id = v_echo_id;

  -------------------------------------------------------
  -- WREN FLIGHT
  -------------------------------------------------------
  insert into public.games (
    id, slug, title, description, engine_key, status, visibility
  ) values (
    v_flight_id, 'wren-flight', 'Wren Flight',
    'Guide the ribbon-tailed wren safely through the hanging vines.',
    'wren-flight-v1', 'published', 'public'
  ) on conflict (slug) do update
    set title = excluded.title,
        description = excluded.description,
        status = excluded.status;

  select id into v_flight_id from public.games where slug = 'wren-flight';

  insert into public.game_versions (
    id, game_id, version, schema_version, engine_version,
    content_digest, config, verification_config, status
  ) values (
    v_flight_version_id, v_flight_id, 1, 1, 'wren-flight-v1',
    '0000000000000000000000000000000000000000000000000000000000000000',
    jsonb_build_object('quality', jsonb_build_array('low', 'balanced', 'high')),
    jsonb_build_object('registered', true, 'mode', 'verified'),
    'draft'
  );

  insert into public.game_difficulties (
    id, game_version_id, key, label, ordinal, config, active
  ) values (
    v_flight_diff_id, v_flight_version_id, 'standard', 'Standard', 0,
    jsonb_build_object(),
    true
  );

  insert into public.game_reward_policies (
    game_version_id, difficulty_id, base_reward, maximum_reward,
    repeat_multiplier_bps, daily_cap, active_from
  ) values (
    v_flight_version_id, v_flight_diff_id, 15, 35, 2500, 100, now()
  );

  update public.game_versions set status = 'published', published_at = now()
  where id = v_flight_version_id;

  update public.games set published_version_id = v_flight_version_id
  where id = v_flight_id;

  -------------------------------------------------------
  -- ZEN CAIRN
  -------------------------------------------------------
  insert into public.games (
    id, slug, title, description, engine_key, status, visibility
  ) values (
    v_cairn_id, 'zen-cairn', 'Zen Cairn',
    'Stack smooth river stones perfectly to build a towering cairn.',
    'zen-cairn-v1', 'published', 'public'
  ) on conflict (slug) do update
    set title = excluded.title,
        description = excluded.description,
        status = excluded.status;

  select id into v_cairn_id from public.games where slug = 'zen-cairn';

  insert into public.game_versions (
    id, game_id, version, schema_version, engine_version,
    content_digest, config, verification_config, status
  ) values (
    v_cairn_version_id, v_cairn_id, 1, 1, 'zen-cairn-v1',
    '0000000000000000000000000000000000000000000000000000000000000000',
    jsonb_build_object('quality', jsonb_build_array('low', 'balanced', 'high')),
    jsonb_build_object('registered', true, 'mode', 'verified'),
    'draft'
  );

  insert into public.game_difficulties (
    id, game_version_id, key, label, ordinal, config, active
  ) values (
    v_cairn_diff_id, v_cairn_version_id, 'standard', 'Standard', 0,
    jsonb_build_object(),
    true
  );

  insert into public.game_reward_policies (
    game_version_id, difficulty_id, base_reward, maximum_reward,
    repeat_multiplier_bps, daily_cap, active_from
  ) values (
    v_cairn_version_id, v_cairn_diff_id, 15, 30, 2500, 100, now()
  );

  update public.game_versions set status = 'published', published_at = now()
  where id = v_cairn_version_id;

  update public.games set published_version_id = v_cairn_version_id
  where id = v_cairn_id;

end;
$$;

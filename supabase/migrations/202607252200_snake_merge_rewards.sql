-- Game Hub Rewards: Snake and Feather Merge Configuration

do $$
declare
  v_snake_id uuid := '00000000-0000-4000-8000-000000000010';
  v_snake_version_id uuid := gen_random_uuid();
  v_snake_diff_id uuid := gen_random_uuid();

  v_merge_id uuid := '00000000-0000-4000-8000-000000000020';
  v_merge_version_id uuid := gen_random_uuid();
  v_merge_diff_id uuid := gen_random_uuid();
begin
  -------------------------------------------------------
  -- SNAKE REWARDS
  -------------------------------------------------------
  
  -- Ensure game exists
  insert into public.games (
    id, slug, title, description, engine_key, status, visibility
  ) values (
    v_snake_id, 'snake', 'Wren Trail Snake', 'Guide a ribbon-tailed wren through a quiet moonlit garden.', 'snake-v1', 'published', 'public'
  ) on conflict (slug) do update set title = excluded.title, description = excluded.description, status = excluded.status;

  select id into v_snake_id from public.games where slug = 'snake';

  -- Version 2 (draft initially)
  insert into public.game_versions (
    id, game_id, version, schema_version, engine_version, content_digest, config, verification_config, status
  ) values (
    v_snake_version_id,
    v_snake_id,
    2,
    1,
    'snake-v1',
    '0000000000000000000000000000000000000000000000000000000000000000',
    jsonb_build_object('board', jsonb_build_object('width', 20, 'height', 15), 'quality', jsonb_build_array('low', 'balanced', 'high')),
    jsonb_build_object('registered', true, 'mode', 'verified'),
    'draft'
  );

  -- Difficulty
  insert into public.game_difficulties (
    id, game_version_id, key, label, ordinal, config, active
  ) values (
    v_snake_diff_id,
    v_snake_version_id,
    'standard',
    'Standard',
    0,
    jsonb_build_object(),
    true
  );

  -- Reward Policy
  insert into public.game_reward_policies (
    game_version_id, difficulty_id, base_reward, maximum_reward, repeat_multiplier_bps, daily_cap, active_from
  ) values (
    v_snake_version_id,
    v_snake_diff_id,
    15,
    30,
    2500,
    100,
    now()
  );

  -- Publish Version 2 for Snake
  update public.game_versions
  set status = 'published', published_at = now()
  where id = v_snake_version_id;

  update public.games set published_version_id = v_snake_version_id where id = v_snake_id;

  -------------------------------------------------------
  -- FEATHER MERGE REWARDS
  -------------------------------------------------------

  -- Ensure game exists
  insert into public.games (
    id, slug, title, description, engine_key, status, visibility
  ) values (
    v_merge_id, 'feather-merge', 'Feather Merge', 'Compose matching feathers into an increasingly luminous collection.', 'feather-merge-v1', 'published', 'public'
  ) on conflict (slug) do update set title = excluded.title, description = excluded.description, status = excluded.status;

  select id into v_merge_id from public.games where slug = 'feather-merge';

  -- Version 2 (draft initially)
  insert into public.game_versions (
    id, game_id, version, schema_version, engine_version, content_digest, config, verification_config, status
  ) values (
    v_merge_version_id,
    v_merge_id,
    2,
    1,
    'feather-merge-v1',
    '0000000000000000000000000000000000000000000000000000000000000000',
    jsonb_build_object('board', jsonb_build_object('size', 4), 'quality', jsonb_build_array('low', 'balanced', 'high')),
    jsonb_build_object('registered', true, 'mode', 'verified'),
    'draft'
  );

  -- Difficulty
  insert into public.game_difficulties (
    id, game_version_id, key, label, ordinal, config, active
  ) values (
    v_merge_diff_id,
    v_merge_version_id,
    'standard',
    'Standard',
    0,
    jsonb_build_object(),
    true
  );

  -- Reward Policy
  insert into public.game_reward_policies (
    game_version_id, difficulty_id, base_reward, maximum_reward, repeat_multiplier_bps, daily_cap, active_from
  ) values (
    v_merge_version_id,
    v_merge_diff_id,
    15,
    30,
    2500,
    100,
    now()
  );

  -- Publish Version 2 for Feather Merge
  update public.game_versions
  set status = 'published', published_at = now()
  where id = v_merge_version_id;

  update public.games set published_version_id = v_merge_version_id where id = v_merge_id;

end;
$$;

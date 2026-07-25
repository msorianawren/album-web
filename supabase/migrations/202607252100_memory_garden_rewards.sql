-- Memory Garden Configuration & Reward Policy

do $$
declare
  v_game_id uuid := '00000000-0000-4000-8000-000000000030';
  v_version_id uuid := gen_random_uuid();
  v_difficulty_id uuid := gen_random_uuid();
begin
  -- 1. Game Record (if missing, insert it - though catalog.ts says it exists, let's upsert safely)
  insert into public.games (
    id, slug, title, description, engine_key, status, visibility
  ) values (
    v_game_id,
    'memory-garden',
    'Memory Garden',
    'Reveal and pair botanical keepsakes from Oriana''s seasonal garden.',
    'memory-garden-v1',
    'published',
    'public'
  ) on conflict (slug) do update set
    title = excluded.title,
    description = excluded.description,
    status = excluded.status;

  select id into v_game_id from public.games where slug = 'memory-garden';

  -- 2. Game Version (Immutable snapshot)
  insert into public.game_versions (
    id, game_id, version, schema_version, engine_version, content_digest, config, verification_config, status
  ) values (
    v_version_id,
    v_game_id,
    1,
    1,
    'memory-garden-v1',
    '0000000000000000000000000000000000000000000000000000000000000000',
    jsonb_build_object(
      'board_size', 16,
      'pair_count', 8
    ),
    jsonb_build_object(
      'verifier_key', 'memory-garden-verifier-v1',
      'shuffle_algorithm', 'seeded-fisher-yates-v1',
      'scoring', 'standard'
    ),
    'draft'
  );

  -- 3. Game Difficulty (Standard)
  insert into public.game_difficulties (
    id, game_version_id, key, label, ordinal, config, active
  ) values (
    v_difficulty_id,
    v_version_id,
    'standard',
    'Standard',
    0,
    jsonb_build_object(),
    true
  );

  -- 4. Reward Policy (15 base, 30 max, repeat 25%)
  insert into public.game_reward_policies (
    game_version_id, difficulty_id, base_reward, maximum_reward, repeat_multiplier_bps, daily_cap, active_from
  ) values (
    v_version_id,
    v_difficulty_id,
    15,
    30,
    2500,
    100,
    now()
  );

  -- 5. Publish the version
  update public.game_versions
  set status = 'published', published_at = now()
  where id = v_version_id;

  -- 6. Update active published_version_id for the game
  update public.games set published_version_id = v_version_id where id = v_game_id;

end;
$$;

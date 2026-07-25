-- Game Hub Rewards: Quiet Meadow Configuration

do $$
declare
  v_game_id uuid := '00000000-0000-4000-8000-000000000040';
  v_version_id uuid := gen_random_uuid();
  
  v_diff_meadow_id uuid := gen_random_uuid();
  v_diff_garden_id uuid := gen_random_uuid();
  v_diff_wildfield_id uuid := gen_random_uuid();
begin

  -- Ensure game exists
  insert into public.games (
    id, slug, title, description, engine_key, status, visibility
  ) values (
    v_game_id, 'quiet-meadow', 'Quiet Meadow', 'Carefully uncover the hidden blooms and dew across the peaceful meadow.', 'quiet-meadow-v1', 'published', 'public'
  ) on conflict (slug) do update set title = excluded.title, description = excluded.description, status = excluded.status;

  select id into v_game_id from public.games where slug = 'quiet-meadow';

  -- Version 1
  insert into public.game_versions (
    id, game_id, version, schema_version, engine_version, content_digest, config, verification_config, status
  ) values (
    v_version_id, v_game_id, 1, 1, 'quiet-meadow-v1',
    '0000000000000000000000000000000000000000000000000000000000000000',
    jsonb_build_object(),
    jsonb_build_object('registered', true, 'mode', 'verified'), 'draft'
  );

  insert into public.game_difficulties (
    id, game_version_id, key, label, ordinal, config, active
  ) values 
  (v_diff_meadow_id, v_version_id, 'meadow', 'Meadow', 0, jsonb_build_object('width', 9, 'height', 9, 'totalMines', 10), true),
  (v_diff_garden_id, v_version_id, 'garden', 'Garden', 1, jsonb_build_object('width', 12, 'height', 12, 'totalMines', 20), true),
  (v_diff_wildfield_id, v_version_id, 'wildfield', 'Wildfield', 2, jsonb_build_object('width', 16, 'height', 16, 'totalMines', 40), true);

  -- Meadow: Base 15, max 30
  insert into public.game_reward_policies (
    game_version_id, difficulty_id, base_reward, maximum_reward, repeat_multiplier_bps, daily_cap, active_from
  ) values (v_version_id, v_diff_meadow_id, 15, 30, 2500, 100, now());

  -- Garden: Base 30, max 60
  insert into public.game_reward_policies (
    game_version_id, difficulty_id, base_reward, maximum_reward, repeat_multiplier_bps, daily_cap, active_from
  ) values (v_version_id, v_diff_garden_id, 30, 60, 2500, 100, now());

  -- Wildfield: Base 60, max 100
  insert into public.game_reward_policies (
    game_version_id, difficulty_id, base_reward, maximum_reward, repeat_multiplier_bps, daily_cap, active_from
  ) values (v_version_id, v_diff_wildfield_id, 60, 100, 2500, 100, now());

  update public.game_versions set status = 'published', published_at = now() where id = v_version_id;
  update public.games set published_version_id = v_version_id where id = v_game_id;

end;
$$;

-- Publish the Game Hub canaries. Rewards remain disabled until verifiers are registered.
insert into public.games (
  id, slug, title, description, engine_key, status, visibility, legacy_source
) values
  (
    '00000000-0000-4000-8000-000000000010',
    'snake',
    'Wren Trail Snake',
    'Guide a ribbon-tailed wren through a quiet moonlit garden.',
    'snake-v1',
    'published',
    'public',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000020',
    'feather-merge',
    'Feather Merge',
    'Compose matching feathers into an increasingly luminous collection.',
    'feather-merge-v1',
    'published',
    'public',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000030',
    'memory-garden',
    'Memory Garden',
    'Reveal and pair botanical keepsakes from Oriana''s seasonal garden.',
    'memory-garden-v1',
    'published',
    'public',
    null
  )
on conflict (slug) do nothing;

insert into public.game_versions (
  id, game_id, version, schema_version, engine_version, content_digest,
  config, verification_config, status, published_at
) values
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000010',
    1, 1, '1.0.0',
    encode(digest('wren-trail-snake-v1', 'sha256'), 'hex'),
    '{"board":{"width":20,"height":15},"quality":["low","balanced","high"]}'::jsonb,
    '{"registered":false,"mode":"practice-only"}'::jsonb,
    'published',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000020',
    1, 1, '1.0.0',
    encode(digest('feather-merge-v1', 'sha256'), 'hex'),
    '{"board":{"size":4},"quality":["low","balanced","high"]}'::jsonb,
    '{"registered":false,"mode":"practice-only"}'::jsonb,
    'published',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000030',
    1, 1, '1.0.0',
    encode(digest('memory-garden-v1', 'sha256'), 'hex'),
    '{"board":{"columns":4,"rows":4},"quality":["low","balanced","high"]}'::jsonb,
    '{"registered":false,"mode":"practice-only"}'::jsonb,
    'published',
    now()
  )
on conflict (game_id, version) do nothing;

insert into public.game_difficulties (
  id, game_version_id, key, label, ordinal, config
) values
  (
    '00000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000011',
    'practice',
    'Garden practice',
    0,
    '{"reward_enabled":false}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000022',
    '00000000-0000-4000-8000-000000000021',
    'practice',
    'Atelier practice',
    0,
    '{"reward_enabled":false}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000032',
    '00000000-0000-4000-8000-000000000031',
    'practice',
    'Garden practice',
    0,
    '{"reward_enabled":false}'::jsonb
  )
on conflict (game_version_id, key) do nothing;

update public.games
set published_version_id = case slug
  when 'snake' then '00000000-0000-4000-8000-000000000011'::uuid
  when 'feather-merge' then '00000000-0000-4000-8000-000000000021'::uuid
  when 'memory-garden' then '00000000-0000-4000-8000-000000000031'::uuid
  else published_version_id
end,
updated_at = now()
where slug in ('snake', 'feather-merge', 'memory-garden');

update public.game_versions
set status = 'published', published_at = coalesce(published_at, now())
where id = '00000000-0000-4000-8000-000000000002'
  and status = 'draft';

update public.games
set status = 'published',
    published_version_id = '00000000-0000-4000-8000-000000000002',
    updated_at = now()
where slug = 'puzzle-atelier';

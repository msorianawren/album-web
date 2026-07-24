do $$
begin
  if exists (
    select 1 from public.game_sessions
    where game_id in (
      '00000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000020',
      '00000000-0000-4000-8000-000000000030'
    )
  ) then
    raise exception 'ROLLBACK_BLOCKED_GAME_CANARY_HISTORY_EXISTS';
  end if;
end;
$$;

update public.games
set published_version_id = null, status = 'archived', updated_at = now()
where id in (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000030'
);

-- Published versions are intentionally retained as immutable audit records.

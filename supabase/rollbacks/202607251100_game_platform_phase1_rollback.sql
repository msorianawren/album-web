-- Non-destructive rollback. Refuse to remove the platform after generic rewards exist.
do $$
begin
  if exists (
    select 1 from public.wren_feather_ledger where event_type = 'game_reward'
  ) then
    raise exception 'ROLLBACK_BLOCKED_GAME_REWARD_HISTORY_EXISTS';
  end if;
end;
$$;

revoke all on function public.finalize_game_session_v1(
  uuid, uuid, text, jsonb, text, integer, integer, jsonb
) from public, anon, authenticated, service_role;
drop function if exists public.finalize_game_session_v1(
  uuid, uuid, text, jsonb, text, integer, integer, jsonb
);

alter table public.wren_feather_ledger
  drop constraint if exists wren_feather_ledger_event_type_check;
alter table public.wren_feather_ledger
  drop column if exists game_result_id;
alter table public.wren_feather_ledger
  add constraint wren_feather_ledger_event_type_check
  check (event_type in ('album_purchase'));

drop trigger if exists game_versions_published_immutable on public.game_versions;
drop trigger if exists game_difficulties_published_immutable on public.game_difficulties;
drop trigger if exists game_assets_published_immutable on public.game_assets;
drop trigger if exists game_content_items_published_immutable on public.game_content_items;
drop trigger if exists game_tutorials_published_immutable on public.game_tutorials;
drop trigger if exists game_mascot_profiles_published_immutable on public.game_mascot_profiles;
drop trigger if exists game_reward_policies_published_immutable on public.game_reward_policies;
drop function if exists public.prevent_published_game_content_mutation();
drop function if exists public.prevent_published_game_version_mutation();

alter table public.games drop constraint if exists games_published_version_fk;
drop table if exists public.game_migration_map;
drop table if exists public.game_runtime_events;
drop table if exists public.game_platform_settings;
drop table if exists public.game_leaderboards;
drop table if exists public.game_daily_reward_usage;
drop table if exists public.game_user_achievements;
drop table if exists public.game_achievements;
drop table if exists public.game_user_stats;
drop table if exists public.game_results;
drop table if exists public.game_reward_policies;
drop table if exists public.game_sessions;
drop table if exists public.game_mascot_profiles;
drop table if exists public.game_tutorials;
drop table if exists public.game_content_items;
drop table if exists public.game_assets;
drop table if exists public.game_difficulties;
drop table if exists public.game_versions;
drop table if exists public.games;

-- Resolve PL/pgSQL output-column ambiguity when returning account reward totals.
create or replace function public.finalize_puzzle_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_elapsed_ms integer,
  p_move_count integer,
  p_trace jsonb,
  p_trace_digest text,
  p_qualified_reward integer
) returns table(reward_earned integer, total_feathers integer, completion_count integer)
language plpgsql security definer set search_path = public as $$
declare
  attempt public.puzzle_attempts%rowtype;
  previous public.puzzle_user_results%rowtype;
  next_reward integer;
  earned integer;
  now_value timestamptz := now();
  first_completion boolean := false;
begin
  select * into attempt from public.puzzle_attempts where id = p_attempt_id and user_id = p_user_id for update;
  if not found then raise exception 'puzzle attempt not found'; end if;
  if attempt.finalized_at is not null then
    return query select attempt.reward_earned,
      coalesce((select profile.total_feathers from public.puzzle_user_profiles as profile where profile.user_id = p_user_id), 0),
      coalesce((select result.completion_count from public.puzzle_user_results as result where result.user_id = p_user_id and result.challenge_id = attempt.challenge_id and result.mode = attempt.mode and result.grid_size = attempt.grid_size), 0);
    return;
  end if;

  select * into previous from public.puzzle_user_results
    where user_id = p_user_id and challenge_id = attempt.challenge_id and mode = attempt.mode and grid_size = attempt.grid_size for update;
  first_completion := not found;
  next_reward := least(100, greatest(5, p_qualified_reward + case when first_completion then 10 else 0 end));
  earned := greatest(0, next_reward - coalesce(previous.best_reward, 0));

  insert into public.puzzle_user_results (user_id, challenge_id, mode, grid_size, best_time_ms, best_move_count, best_reward, completion_count, first_completed_at, last_completed_at)
  values (p_user_id, attempt.challenge_id, attempt.mode, attempt.grid_size, p_elapsed_ms, p_move_count, next_reward, 1, now_value, now_value)
  on conflict (user_id, challenge_id, mode, grid_size) do update set
    best_time_ms = case when excluded.best_time_ms < puzzle_user_results.best_time_ms then excluded.best_time_ms else puzzle_user_results.best_time_ms end,
    best_move_count = case when excluded.best_move_count < puzzle_user_results.best_move_count then excluded.best_move_count else puzzle_user_results.best_move_count end,
    best_reward = greatest(puzzle_user_results.best_reward, excluded.best_reward),
    completion_count = puzzle_user_results.completion_count + 1,
    last_completed_at = now_value;

  insert into public.puzzle_user_profiles (user_id, total_feathers, level, total_completed, updated_at)
  values (p_user_id, earned, greatest(1, floor(earned / 100.0)::integer + 1), 1, now_value)
  on conflict (user_id) do update set
    total_feathers = puzzle_user_profiles.total_feathers + earned,
    level = greatest(1, floor((puzzle_user_profiles.total_feathers + earned) / 100.0)::integer + 1),
    total_completed = puzzle_user_profiles.total_completed + 1,
    updated_at = now_value;

  update public.puzzle_attempts set
    completed_at = now_value, elapsed_ms = p_elapsed_ms, move_count = p_move_count,
    trace = p_trace, trace_digest = p_trace_digest, verified = true,
    reward_earned = earned, finalized_at = now_value
  where id = p_attempt_id;

  return query select earned,
    (select profile.total_feathers from public.puzzle_user_profiles as profile where profile.user_id = p_user_id),
    (select result.completion_count from public.puzzle_user_results as result where result.user_id = p_user_id and result.challenge_id = attempt.challenge_id and result.mode = attempt.mode and result.grid_size = attempt.grid_size);
end;
$$;

revoke all on function public.finalize_puzzle_attempt(uuid, uuid, integer, integer, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.finalize_puzzle_attempt(uuid, uuid, integer, integer, jsonb, text, integer) to service_role;

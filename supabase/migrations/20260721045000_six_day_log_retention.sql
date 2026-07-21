-- Add expires_at to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN expires_at timestamptz;
UPDATE public.audit_logs SET expires_at = created_at + interval '6 days';
ALTER TABLE public.audit_logs ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN expires_at SET DEFAULT (now() + interval '6 days');
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_expires_at_limit CHECK (expires_at <= created_at + interval '6 days');
CREATE INDEX idx_audit_logs_expires_at ON public.audit_logs (expires_at);

-- Add expires_at to user_album_activity
ALTER TABLE public.user_album_activity ADD COLUMN expires_at timestamptz;
UPDATE public.user_album_activity SET expires_at = created_at + interval '6 days';
ALTER TABLE public.user_album_activity ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE public.user_album_activity ALTER COLUMN expires_at SET DEFAULT (now() + interval '6 days');
ALTER TABLE public.user_album_activity ADD CONSTRAINT user_album_activity_expires_at_limit CHECK (expires_at <= created_at + interval '6 days');
CREATE INDEX idx_user_album_activity_expires_at ON public.user_album_activity (expires_at);

-- Delete expired data immediately
DELETE FROM public.audit_logs WHERE expires_at <= now();
DELETE FROM public.user_album_activity WHERE expires_at <= now();

-- Create RPC function to prune expired telemetry with advisory lock
CREATE OR REPLACE FUNCTION public.prune_expired_telemetry()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_audit_logs_count int := 0;
  deleted_user_album_activity_count int := 0;
  start_time timestamptz := now();
  finish_time timestamptz;
  lock_acquired boolean;
  lock_key constant bigint := 8374927493847; -- Arbitrary unique lock ID
BEGIN
  -- Attempt to acquire an advisory lock for this operation
  SELECT pg_try_advisory_xact_lock(lock_key) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RETURN json_build_object(
      'success', false,
      'status', 'skipped_already_running',
      'started_at', start_time,
      'finished_at', now()
    );
  END IF;

  WITH deleted_audit AS (
    DELETE FROM public.audit_logs
    WHERE expires_at <= now()
    RETURNING 1
  )
  SELECT count(*) INTO deleted_audit_logs_count FROM deleted_audit;

  WITH deleted_activity AS (
    DELETE FROM public.user_album_activity
    WHERE expires_at <= now()
    RETURNING 1
  )
  SELECT count(*) INTO deleted_user_album_activity_count FROM deleted_activity;

  finish_time := now();

  RETURN json_build_object(
    'success', true,
    'status', 'completed',
    'deleted_audit_logs', deleted_audit_logs_count,
    'deleted_user_album_activity', deleted_user_album_activity_count,
    'started_at', start_time,
    'finished_at', finish_time
  );
END;
$$;

-- Revoke execute from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.prune_expired_telemetry() FROM public;
REVOKE EXECUTE ON FUNCTION public.prune_expired_telemetry() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prune_expired_telemetry() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prune_expired_telemetry() TO service_role;

-- Set up pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  -- Unschedule if exists to be idempotent
  BEGIN
    PERFORM cron.unschedule('prune-expired-telemetry-hourly');
  EXCEPTION WHEN others THEN
    -- Ignore if doesn't exist
  END;

  -- Schedule job
  PERFORM cron.schedule(
    'prune-expired-telemetry-hourly',
    '15 * * * *',
    'SELECT public.prune_expired_telemetry();'
  );
END $$;

-- Clear old logs accurately to start fresh
TRUNCATE TABLE public.audit_logs;

-- Add ip_info column for storing full WHOIS-style geolocation data
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS ip_info jsonb NOT NULL DEFAULT '{}'::jsonb;

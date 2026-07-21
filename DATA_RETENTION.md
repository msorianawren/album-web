# Data Retention Policy

This document outlines the telemetry retention policies enforced on the database, specifically related to user activity and audit logging.

## Telemetry Logs

The following tables are subject to a **6-day maximum retention period**:
- `public.audit_logs`
- `public.user_album_activity`

The expiry date (`expires_at`) for each row is automatically calculated from its `created_at` timestamp. Records are definitively marked for deletion if `expires_at <= now()`.

### Retention Mechanisms
Telemetry logs are pruned using two redundant mechanisms to guarantee expiration:
1. **Supabase pg_cron (Primary)**: An hourly job (`prune-expired-telemetry-hourly`) runs at the **15th minute** of every hour. It executes a secure database RPC `prune_expired_telemetry()`.
2. **Vercel Cron (Fallback)**: An hourly job executes at the **45th minute** of every hour. It triggers the `/api/cron/prune-logs` route, which invokes the same database RPC.

Both mechanisms invoke the `public.prune_expired_telemetry()` function, which is designed with advisory locks to prevent overlapping execution.

### Checking Expired Rows
You can query the remaining expired rows manually (should be zero unless the cron has fallen behind):
```sql
SELECT count(*) FROM public.audit_logs WHERE expires_at <= now();
SELECT count(*) FROM public.user_album_activity WHERE expires_at <= now();
```
To run the cleanup manually via Supabase SQL Editor (as a privileged user):
```sql
SELECT public.prune_expired_telemetry();
```

## Business Data
The following business data is explicitly **excluded** from the 6-day telemetry retention cleanup and is managed by separate business rules:
- `albums`
- `media`
- `comments`
- `likes`
- `user_profiles`
- `album_access_requests`
- `album_access_grants`
- Wren Feathers ledger
- Puzzle rewards
- Configuration and settings
- Contact messages (managed by a separate, configurable retention window)
- Raw files stored in Cloudflare R2

## Provider Backups and Historical Logs
- **Supabase Database Backups**: Live rows deleted from the primary database remain in point-in-time (PITR) and daily backups maintained by Supabase for a period defined by the project's billing tier. Deleting live telemetry does not guarantee immediate deletion of historical backup images.
- **External Platform Logs**: Vercel Runtime Logs, Supabase Platform Logs (e.g., edge network, auth logs, postgres logs), and Cloudflare Logs are managed entirely by their respective providers and are not affected by this application-level retention policy.

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const TABLES = {
  puzzle_challenges: "id,title,description,collection,source_type,source_media_id,puzzle_asset_key,preview_asset_key,focal_x,focal_y,allowed_modes,allowed_grid_sizes,visibility,targets,reward_multiplier,base_seed,status,created_by,published_at,created_at,updated_at",
  puzzle_attempts: "id,challenge_id,user_id,mode,grid_size,seed,started_at,completed_at,elapsed_ms,move_count,trace,trace_digest,verified,reward_earned,finalized_at",
  puzzle_user_results: "user_id,challenge_id,mode,grid_size,best_time_ms,best_move_count,best_reward,completion_count,first_completed_at,last_completed_at",
  puzzle_user_profiles: "user_id,total_feathers,level,total_completed,updated_at",
  puzzle_user_badges: "user_id,badge_key,earned_at,source_challenge_id",
};
const PAGE_SIZE = 500;
const backupArgument = process.argv.find((argument) => argument.startsWith("--backup="));
const backupPath = backupArgument ? resolve(backupArgument.slice("--backup=".length)) : null;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const client = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const report = {
  generatedAt: new Date().toISOString(),
  mode: backupPath ? "backup" : "inventory",
  tables: {},
};

for (const [table, columns] of Object.entries(TABLES)) {
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const serialized = JSON.stringify(rows);
  report.tables[table] = {
    rows: rows.length,
    sha256: createHash("sha256").update(serialized).digest("hex"),
    ...(backupPath ? { data: rows } : {}),
  };
}

if (backupPath) {
  await mkdir(dirname(backupPath), { recursive: true });
  await writeFile(backupPath, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`Legacy puzzle backup written to ${backupPath}\n`);
} else {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

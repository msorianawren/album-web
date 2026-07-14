import {
  createTrustedDatabase,
  fetchAll,
  hasFlag,
} from "./common.mjs";

const apply = hasFlag("--apply") && !hasFlag("--dry-run");
const database = createTrustedDatabase();
const rows = await fetchAll((from, to) =>
  database
    .from("private_media_assets")
    .select("id,legacy_object_key")
    .eq("migration_state", "active")
    .eq("bucket_role", "private")
    .order("id", { ascending: true })
    .range(from, to),
);

if (!apply) {
  console.log(`Dry run: ${rows.length} active assets would return to authenticated legacy gateway delivery.`);
  console.log("No manifest rows or R2 objects changed.");
  process.exit(0);
}

for (const row of rows) {
  const { error } = await database
    .from("private_media_assets")
    .update({
      object_key: row.legacy_object_key,
      bucket_role: "public",
      migration_state: "rollback_required",
      activated_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("migration_state", "active");
  if (error) throw error;
}

console.log(`Rollback complete: ${rows.length} assets restored to authenticated legacy gateway delivery.`);
console.log("Copied private objects and legacy source objects were preserved.");

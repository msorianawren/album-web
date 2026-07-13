import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const tablesToCheck = [
    "albums",
    "media",
    "contact_messages",
    "album_access_requests",
    "album_invites"
  ];
  
  for (const t of tablesToCheck) {
    const { error } = await supabase.from(t).select("id").limit(1);
    if (error && error.code === "PGRST205") {
      console.log(`❌ Table missing: ${t}`);
    } else if (error) {
      console.log(`⚠️ Error on ${t}: ${error.message}`);
    } else {
      console.log(`✅ Table exists: ${t}`);
    }
  }
}

main();

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase.from("albums").select("id, title, status");
  if (error) {
    console.error(error);
  } else {
    fs.writeFileSync("albums_dump.json", JSON.stringify(data, null, 2));
    console.log("Done");
  }
}

main();

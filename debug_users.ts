import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching users:", error);
  } else {
    const userEmails = users.users.map(u => u.email);
    console.log("Registered users:", userEmails);
  }
}

main();

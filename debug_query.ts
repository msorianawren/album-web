import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const testEmail = "nguyenthithh1@gmail.comm";
  
  const { data, error } = await supabase
      .from("contact_messages")
      .select("id, subject, message_body, reply_text, replied_at, created_at, status")
      .eq("reply_email", testEmail)
      .order("created_at", { ascending: false });

  console.log("Error:", error);
  console.log("Data:", data);
}

main();

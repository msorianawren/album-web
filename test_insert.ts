import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase
    .from("album_access_requests")
    .insert({
      album_id: "dac7f104-d373-46fb-be06-067f93833c73", // "cA" album which is private
      requester_user_id: null,
      requester_email: "test@example.com",
      requester_name: "Test Name",
      requester_phone: "123456789",
      reason: "Test reason",
      status: "pending"
    })
    .select("id, status")
    .single();

  if (error) {
    console.error("INSERT ERROR:", error);
  } else {
    console.log("INSERT SUCCESS:", data);
  }
}

main();

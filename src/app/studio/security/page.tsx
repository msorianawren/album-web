import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SecurityConsole } from "@/components/studio/SecurityConsole";
import { getPublicSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { AuditLog, UserProfile } from "@/lib/types";

export default async function StudioSecurityPage() {
  const session = await getPublicSession();

  if (!session.userId) redirect("/login?next=/studio/security");
  if (session.isBlocked) redirect("/boycott");
  if (!session.isAdmin) redirect("/studio");

  const [{ data: users }, { data: logs }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(200),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <SecurityConsole
        initialUsers={(users ?? []) as UserProfile[]}
        initialLogs={(logs ?? []) as AuditLog[]}
        adminUserId={session.userId}
      />
    </main>
  );
}

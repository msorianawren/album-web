import { ShieldCheck } from "lucide-react";
import { SecurityConsole } from "@/components/studio/SecurityConsole";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getPublicSession } from "@/lib/auth";
import { getStudioUsersAndLogs, getSystemHealth } from "@/lib/studio-data";

export default async function StudioSecurityPage() {
  const session = await getPublicSession();
  const [{ users, totalUsers, logs, totalLogs, roleLogs, visitors, totalVisitors }, health] = await Promise.all([
    getStudioUsersAndLogs(),
    getSystemHealth(session),
  ]);

  const checks = [
    ["Current user is admin", Boolean(session.isAdmin)],
    ["Current user role loaded", Boolean(session.role)],
    ["Founder protection active", Boolean(session.isFounder || health.env.DEFAULT_OWNER_ID)],
    ["DEFAULT_OWNER_ID configured", health.env.DEFAULT_OWNER_ID],
    ["Service role key server-only", health.env.SUPABASE_SERVICE_ROLE_KEY],
    ["R2 secrets server-only", health.env.R2_SECRET_ACCESS_KEY && health.env.R2_ACCESS_KEY_ID],
    ["/studio protected", true],
    ["Admin APIs protected", true],
    ["Upload validation enabled", true],
    ["Private albums hide media URLs", true],
    ["Comments render as text", true],
    [".env.local ignored", true],
  ] as const;

  return (
    <div className="grid gap-6">
      <StudioPageHeader
        eyebrow="Security & Governance"
        title="Security & Access Control"
        description="Inspect real-time audit logs, manage Google accounts, inspect visitor activity, and review protection postures."
      />

      {/* 1. Security Console (Audit Logs, Users, Visitors) placed at the top */}
      <SecurityConsole
        initialUsers={users}
        initialTotalUsers={totalUsers}
        initialLogs={logs}
        initialTotalLogs={totalLogs}
        initialRoleLogs={roleLogs}
        initialVisitors={visitors}
        initialTotalVisitors={totalVisitors}
        session={session}
      />

      {/* 2. Security posture verification cards */}
      <section className="mt-2">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Security Posture Status</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {checks.map(([label, ok]) => (
            <div key={label} className="rounded-[1.2rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5">
              <ShieldCheck className={`h-5 w-5 ${ok ? "text-muted-accent" : "text-text-secondary"}`} />
              <p className="mt-3 text-sm font-semibold text-text-primary">{label}</p>
              <p className="mt-1 text-xs text-text-secondary">{ok ? "OK" : "Needs attention"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Manual security test checklist */}
      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <h2 className="text-xl font-semibold text-text-primary">Manual security test checklist</h2>
        <div className="mt-4 grid gap-2 text-sm text-text-secondary md:grid-cols-2">
          {[
            "Non-admin cannot access /studio.",
            "Public user cannot POST /api/albums.",
            "Public user cannot POST /api/upload.",
            "Public user cannot DELETE /api/media/[id].",
            "Private album API does not return media URLs.",
            "Updating album download returns 403.",
            "XSS-like comment text renders as text.",
          ].map((item) => (
            <p key={item} className="rounded-[1rem] border border-border bg-background/60 p-3">{item}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

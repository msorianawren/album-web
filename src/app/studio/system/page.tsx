import packageJson from "../../../../package.json";
import type { ReactNode } from "react";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getPublicSession } from "@/lib/auth";
import { getSystemHealth } from "@/lib/studio-data";

export default async function StudioSystemPage() {
  const session = await getPublicSession();
  const health = await getSystemHealth(session);

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Diagnostics"
        title="System Health"
        description="Read-only environment, database, storage, and deployment diagnostics. Secrets are never shown."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Environment" value={health.environment} />
        <Info label="Site URL" value={health.siteUrl ?? "Missing"} />
        <Info label="Supabase URL" value={health.supabaseUrl ?? "Missing"} />
        <Info label="App version" value={packageJson.version} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Required environment variables">
          {Object.entries(health.env).map(([key, present]) => (
            <Status key={key} label={key} ok={present} />
          ))}
        </Panel>
        <Panel title="Required tables">
          {health.tableChecks.map((check) => (
            <Status key={check.table} label={check.table} ok={check.ok} />
          ))}
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(health.counts).map(([key, value]) => (
          <Info key={key} label={key} value={String(value)} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="R2">
          <Info label="Bucket" value={health.r2Bucket.value ?? (health.r2Bucket.present ? "Configured" : "Missing")} />
          <Info label="Public URL" value={health.r2PublicUrl ?? "Missing"} />
          <p className="rounded-[1rem] border border-border bg-background/60 p-3 text-xs text-text-secondary">
            <strong>CORS Setup Required:</strong> Direct browser-to-R2 uploads require CORS configuration on your bucket. Allowed origins must include your production domain and localhost, with PUT allowed. See <code>R2_CORS_SETUP.md</code>.
          </p>
        </Panel>
        <Panel title="Deployment">
          <Info label="Commit" value={health.deployment.vercelGitCommitSha ?? "Local or unavailable"} />
          <Info label="Region" value={health.deployment.vercelRegion ?? "Local or unavailable"} />
          <Info label="Next.js" value={packageJson.dependencies.next} />
          <Info label="React" value={packageJson.dependencies.react} />
        </Panel>
      </section>

      <Panel title="Runtime warnings">
        {[
          !health.env.NEXT_PUBLIC_SUPABASE_URL ? "NEXT_PUBLIC_SUPABASE_URL is missing." : null,
          !health.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY is missing." : null,
          !health.env.R2_PUBLIC_URL ? "R2_PUBLIC_URL is missing." : null,
          !health.tableChecks.every((check) => check.ok) ? "One or more required tables are missing." : null,
        ].filter(Boolean).map((warning) => (
          <p key={warning} className="rounded-[1rem] border border-border bg-background/60 p-3 text-sm text-text-secondary">{warning}</p>
        ))}
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

function Status({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-border bg-background/60 p-3 text-sm">
      <span className="min-w-0 truncate text-text-primary">{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ok ? "bg-accent text-accent-foreground" : "bg-surface-secondary text-text-secondary"}`}>
        {ok ? "OK" : "Missing"}
      </span>
    </div>
  );
}

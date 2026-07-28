"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Link2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MetaConnectionStatusPayload } from "@/lib/meta/types";

export function MetaIntegrationPanel() {
  const [status, setStatus] = useState<MetaConnectionStatusPayload | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/integrations/meta/status", { cache: "no-store" });
    const payload = await response.json();
    if (payload.success) setStatus(payload.data);
    else setMessage(payload.message ?? "Could not load the Facebook connection.");
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function post(path: string, body?: unknown) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const payload = await response.json();
      setMessage(payload.success ? "Saved." : payload.message ?? "The request could not be completed.");
      if (payload.success) await load();
    } finally { setBusy(false); }
  }
  if (!status) return <div className="rounded-[1.25rem] bg-surface-secondary/50 p-6 text-sm text-text-secondary">Loading Facebook integration…</div>;
  const connection = status.connection;
  return <div className="grid gap-6">
    <div className="flex flex-col justify-between gap-5 rounded-[1.25rem] border border-border bg-surface/75 p-6 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-4">
        {connection?.page_picture_url ? <img src={connection.page_picture_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-secondary"><Link2 className="h-5 w-5 text-text-secondary" /></div>}
        <div><p className="font-medium text-text-primary">{connection?.page_name ?? "Facebook Page"}</p><p className="mt-1 text-sm text-text-secondary">{!status.configured ? "Configuration required" : connection ? connection.connection_status.replace("_", " ") : "Disconnected"}</p></div>
      </div>
      {!status.configured ? null : status.pendingPageSelection ? null : !connection || connection.connection_status !== "connected" ? <Button onClick={() => { window.location.assign("/api/admin/integrations/meta/connect"); }}><Link2 className="mr-2 h-4 w-4" />{connection ? "Reconnect Facebook" : "Connect Facebook"}</Button> : <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => void post("/api/admin/integrations/meta/sync")}><RefreshCw className="mr-2 h-4 w-4" />Sync now</Button><Button variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Disconnect Facebook? Existing landing selections stay saved, but no further sync will run.")) void post("/api/admin/integrations/meta/disconnect", { confirm: true }); }}><Unplug className="mr-2 h-4 w-4" />Disconnect</Button></div>}
    </div>
    {!status.configured ? <div className="flex gap-3 rounded-[1.25rem] border border-border bg-surface/65 p-5 text-sm text-text-secondary"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>Add the server-only Meta app and token-vault variables, then return here to connect a Page. The public section stays disabled until a selection is saved.</p></div> : null}
    {status.pendingPageSelection ? <div className="rounded-[1.25rem] border border-border bg-surface/75 p-6"><div className="mb-4 flex items-center gap-2 text-sm text-text-secondary"><CheckCircle2 className="h-4 w-4" />Choose the Page to connect</div>{status.pages.length ? <div className="grid gap-3">{status.pages.map((page) => <button key={page.id} disabled={busy} onClick={() => void post("/api/admin/integrations/meta/select-page", { pageId: page.id })} className="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-surface-secondary"><span className="grid h-9 w-9 place-items-center rounded-full bg-surface-secondary text-xs">{page.name.slice(0, 1)}</span><span className="min-w-0"><span className="block truncate font-medium text-text-primary">{page.name}</span><span className="block truncate text-xs text-text-secondary">{page.id}</span></span></button>)}</div> : <p className="text-sm text-text-secondary">No manageable Pages were returned. Check the Page role and Meta permissions, then reconnect.</p>}</div> : null}
    {connection ? <dl className="grid gap-4 rounded-[1.25rem] bg-surface-secondary/45 p-5 text-sm sm:grid-cols-2"><div><dt className="text-text-secondary">Page ID</dt><dd className="mt-1 font-medium text-text-primary">{connection.page_id}</dd></div><div><dt className="text-text-secondary">Videos cached</dt><dd className="mt-1 font-medium text-text-primary">{status.feedCount}</dd></div><div><dt className="text-text-secondary">Last successful sync</dt><dd className="mt-1 font-medium text-text-primary">{connection.last_successful_sync_at ? new Date(connection.last_successful_sync_at).toLocaleString() : "Not yet synced"}</dd></div><div><dt className="text-text-secondary">Permissions</dt><dd className="mt-1 font-medium text-text-primary">{connection.granted_scopes.join(", ")}</dd></div>{connection.last_error_message ? <div className="sm:col-span-2"><dt className="text-text-secondary">Last attention note</dt><dd className="mt-1 text-text-primary">{connection.last_error_message}</dd></div> : null}</dl> : null}
    {message ? <p className="text-sm text-text-secondary" role="status">{message}</p> : null}
  </div>;
}

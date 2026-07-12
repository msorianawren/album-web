"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Eye, Clock, CalendarDays, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface UserActivityPanelProps {
  userId: string;
  onClose: () => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function UserActivityPanel({ userId, onClose }: UserActivityPanelProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "viewed" | "downloads" | "timeline">("overview");

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/studio/users/${userId}/activity`);
      const payload = await response.json();
      if (payload.success) {
        setData(payload.data);
      } else {
        setError(payload.message || "Failed to load user activity.");
      }
    } catch {
      setError("Network error fetching activity.");
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchActivity();
  }, [fetchActivity]);

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-border bg-surface shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="text-xl font-semibold text-text-primary animate-pulse w-48 h-6 bg-background rounded"></h2>
          <Button variant="ghost" onClick={onClose} className="p-2 rounded-full"><X className="h-5 w-5" /></Button>
        </div>
        <div className="p-6 flex-1 flex items-center justify-center">
          <p className="text-sm text-text-secondary animate-pulse">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-border bg-surface shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="text-xl font-semibold text-text-primary">Error</h2>
          <Button variant="ghost" onClick={onClose} className="p-2 rounded-full"><X className="h-5 w-5" /></Button>
        </div>
        <div className="p-6">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  const { user, summary, viewed_albums, downloaded_albums, timeline } = data as Record<string, any>;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-border bg-surface shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between border-b border-border p-6 bg-surface/82 backdrop-blur z-10">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{user.name || user.email}</h2>
          <p className="text-sm text-text-secondary font-mono mt-1">{user.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchActivity} className="text-xs">Refresh</Button>
          <Button variant="ghost" onClick={onClose} className="p-2 rounded-full"><X className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="flex items-center gap-6 px-6 pt-4 border-b border-border text-sm overflow-x-auto">
        {(["overview", "viewed", "downloads", "timeline"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "pb-4 font-semibold capitalize whitespace-nowrap transition-colors border-b-2",
              tab === t ? "border-text-primary text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            {t === "viewed" ? `Viewed Albums (${viewed_albums.length})` : 
             t === "downloads" ? `Downloads (${downloaded_albums.length})` : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-background/30">
        {tab === "overview" && (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-border bg-background p-4">
                <p className="text-xs text-text-secondary uppercase tracking-[0.1em]">User Role</p>
                <p className="mt-1 font-semibold text-text-primary uppercase">{user.role}</p>
              </div>
              <div className="rounded-[1rem] border border-border bg-background p-4">
                <p className="text-xs text-text-secondary uppercase tracking-[0.1em]">Status</p>
                <p className={cn("mt-1 font-semibold capitalize", user.status === "blocked" ? "text-red-500" : "text-text-primary")}>{user.status}</p>
              </div>
              <div className="rounded-[1rem] border border-border bg-background p-4">
                <p className="text-xs text-text-secondary uppercase tracking-[0.1em]">Registration Source</p>
                <p className="mt-1 font-semibold text-text-primary capitalize">{user.source || "Direct"}</p>
              </div>
              <div className="rounded-[1rem] border border-border bg-background p-4">
                <p className="text-xs text-text-secondary uppercase tracking-[0.1em]">Created At</p>
                <p className="mt-1 font-semibold text-text-primary">{formatDate(user.created_at)}</p>
              </div>
            </div>

            <div className="rounded-[1rem] border border-border bg-background overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-surface/50">
                <h3 className="font-semibold text-text-primary">Activity Summary</h3>
              </div>
              <div className="p-5 grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-surface text-text-secondary"><Eye className="h-4 w-4" /></div>
                  <div>
                    <p className="text-2xl font-semibold text-text-primary">{summary.viewed_album_count}</p>
                    <p className="text-xs text-text-secondary mt-0.5">Albums viewed</p>
                    <p className="text-[0.65rem] text-text-secondary mt-1">Last: {formatDate(summary.last_viewed_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-surface text-text-secondary"><Download className="h-4 w-4" /></div>
                  <div>
                    <p className="text-2xl font-semibold text-text-primary">{summary.downloaded_album_count}</p>
                    <p className="text-xs text-text-secondary mt-0.5">Albums downloaded</p>
                    <p className="text-[0.65rem] text-text-secondary mt-1">Last: {formatDate(summary.last_downloaded_at)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="rounded-xl border border-dashed border-border bg-surface/50 p-4 text-xs text-text-secondary">
              <p className="font-semibold text-text-primary mb-1">Admin Privacy Note</p>
              Activity is recorded for security and account management. Sensitive URLs, tokens, and storage keys are never stored in the database.
            </div>
          </div>
        )}

        {tab === "viewed" && (
          <div className="grid gap-3">
            {viewed_albums.length ? viewed_albums.map((item: Record<string, any>) => (
              <div key={item.album_id} className="rounded-[1rem] border border-border bg-background p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-text-primary flex items-center gap-2">
                    {item.title}
                    <span className="text-[0.65rem] border border-border rounded px-1.5 py-0.5 uppercase tracking-wider">{item.status}</span>
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {item.view_count} views</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last: {formatDate(item.last_viewed_at)}</span>
                  </div>
                </div>
                <Button variant="secondary" className="text-xs h-8" onClick={() => window.open(`/studio/albums/${item.album_id}`, '_blank')}>
                  Open <ExternalLink className="h-3 w-3 ml-1.5" />
                </Button>
              </div>
            )) : (
              <p className="text-sm text-text-secondary p-8 text-center border border-dashed border-border rounded-[1rem]">No viewed albums recorded yet.</p>
            )}
          </div>
        )}

        {tab === "downloads" && (
          <div className="grid gap-3">
            {downloaded_albums.length ? downloaded_albums.map((item: Record<string, any>) => (
              <div key={item.album_id} className="rounded-[1rem] border border-border bg-background p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-text-primary flex items-center gap-2">
                    {item.title}
                    <span className="text-[0.65rem] border border-border rounded px-1.5 py-0.5 uppercase tracking-wider">{item.status}</span>
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {item.download_count} files</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last: {formatDate(item.last_downloaded_at)}</span>
                  </div>
                </div>
                <Button variant="secondary" className="text-xs h-8" onClick={() => window.open(`/studio/albums/${item.album_id}`, '_blank')}>
                  Open <ExternalLink className="h-3 w-3 ml-1.5" />
                </Button>
              </div>
            )) : (
              <p className="text-sm text-text-secondary p-8 text-center border border-dashed border-border rounded-[1rem]">No downloads recorded yet.</p>
            )}
          </div>
        )}

        {tab === "timeline" && (
          <div className="relative pl-4 border-l-2 border-border/60 ml-2 space-y-6">
            {timeline.length ? timeline.map((event: Record<string, any>) => (
              <div key={event.id} className="relative">
                <div className="absolute w-3 h-3 bg-surface border-2 border-accent rounded-full -left-[1.35rem] top-1"></div>
                <div className="rounded-[1rem] border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-text-primary">
                      {event.event_type.split('_').join(' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </p>
                    <p className="text-[0.7rem] text-text-secondary">{formatDate(event.created_at)}</p>
                  </div>
                  <p className="mt-2 text-xs text-text-secondary flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" /> {event.album_title}
                  </p>
                  {event.result && event.result !== "success" && (
                    <p className="mt-1.5 inline-flex text-[0.7rem] px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full font-medium">
                      {event.result}: {event.reason_code || "Unknown"}
                    </p>
                  )}
                </div>
              </div>
            )) : (
              <p className="text-sm text-text-secondary p-8 text-center border border-dashed border-border rounded-[1rem] -ml-4">No activity timeline yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

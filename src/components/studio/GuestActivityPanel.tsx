"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Eye, Clock, CalendarDays, ExternalLink, X, Smartphone, Globe, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { GuestVisitor } from "@/lib/types";

interface GuestActivityPanelProps {
  visitorId: string;
  onClose: () => void;
}

interface ActivitySummary {
  total_view_events: number;
  viewed_album_count: number;
  total_download_events: number;
  downloaded_album_count: number;
  last_viewed_at: string | null;
  last_downloaded_at: string | null;
}

interface AlbumActivitySummary {
  album_id: string;
  title: string;
  count: number;
  last_at: string;
}

interface ActivityTimelineEvent {
  id: string;
  event_type: string;
  created_at: string;
  album_id: string | null;
  source: string | null;
  albums?: { title: string; slug: string; status: string } | null;
}

interface GuestActivityData {
  visitor: GuestVisitor;
  summary: ActivitySummary;
  viewed_albums: AlbumActivitySummary[];
  downloaded_albums: AlbumActivitySummary[];
  timeline: ActivityTimelineEvent[];
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function GuestActivityPanel({ visitorId, onClose }: GuestActivityPanelProps) {
  const [data, setData] = useState<GuestActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "viewed" | "downloads" | "timeline">("overview");

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/guest-visitors/${visitorId}`);
      const payload = await response.json();
      if (payload.success) {
        setData(payload.data);
      } else {
        setError(payload.message || "Failed to load guest activity.");
      }
    } catch {
      setError("Network error fetching guest activity.");
    }
    setLoading(false);
  }, [visitorId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchActivity();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchActivity]);

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-border bg-surface shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="animate-pulse w-48 h-6 bg-background rounded" />
          <Button variant="ghost" className="p-2 h-9 w-9" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6 space-y-4">
          <div className="h-20 bg-background/50 animate-pulse rounded-lg" />
          <div className="h-32 bg-background/50 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-border bg-surface shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-primary">Error</h2>
          <Button variant="ghost" className="p-2 h-9 w-9" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-status-error mb-4">{error || "Visitor not found"}</p>
        <Button onClick={fetchActivity}>Retry</Button>
      </div>
    );
  }

  const { visitor, summary, viewed_albums, downloaded_albums, timeline } = data;
  const meta = visitor.metadata ?? {};
  const deviceStr = [meta.device, meta.browser, meta.os].filter(Boolean).join(" • ") || "Unknown Device";
  const locationStr = [visitor.city, visitor.country_code].filter(Boolean).join(", ") || "Unknown Location";

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-border bg-surface shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-6 bg-surface/50 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-accent-primary">
              {visitor.visitor_name}
            </span>
            {visitor.linked_user_email && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                <UserCheck className="w-3 h-3" />
                Linked to {visitor.linked_user_email}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {locationStr} ({visitor.ip_masked || "No IP"})
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              {deviceStr}
            </span>
          </p>
        </div>
        <Button variant="ghost" className="p-2 h-9 w-9" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface px-6 pt-2">
        <button
          onClick={() => setTab("overview")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === "overview"
              ? "border-accent-primary text-text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("viewed")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === "viewed"
              ? "border-accent-primary text-text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          Viewed Albums ({viewed_albums.length})
        </button>
        <button
          onClick={() => setTab("downloads")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === "downloads"
              ? "border-accent-primary text-text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          Downloads ({downloaded_albums.length})
        </button>
        <button
          onClick={() => setTab("timeline")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === "timeline"
              ? "border-accent-primary text-text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          Timeline ({timeline.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                  <Eye className="w-4 h-4 text-accent-primary" />
                  View Activity
                </div>
                <div className="text-2xl font-bold text-text-primary">{summary.total_view_events}</div>
                <p className="text-xs text-text-muted mt-1">Across {summary.viewed_album_count} unique albums</p>
              </div>

              <div className="p-4 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                  <Download className="w-4 h-4 text-emerald-400" />
                  Download Activity
                </div>
                <div className="text-2xl font-bold text-text-primary">{summary.total_download_events}</div>
                <p className="text-xs text-text-muted mt-1">From {summary.downloaded_album_count} unique albums</p>
              </div>
            </div>

            {/* Visitor Identity & Metadata */}
            <div className="p-4 rounded-xl bg-background/50 border border-border space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Visitor Information</h3>
              <div className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <span className="text-text-muted block">First Seen:</span>
                  <span className="text-text-primary font-medium">{formatDate(visitor.first_seen_at)}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Last Active:</span>
                  <span className="text-text-primary font-medium">{formatDate(visitor.last_seen_at)}</span>
                </div>
                <div>
                  <span className="text-text-muted block">In-App Browser:</span>
                  <span className="text-text-primary font-medium">{(meta.in_app as string) || "None (Standard Browser)"}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Linked Account:</span>
                  <span className="text-text-primary font-medium">{visitor.linked_user_email || "Guest (Not Registered)"}</span>
                </div>
              </div>
            </div>

            {/* Recent Timeline Preview */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Recent Events</h3>
              <div className="space-y-2">
                {timeline.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/50 text-xs">
                    <div className="flex items-center gap-2">
                      {evt.event_type.includes("download") ? (
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-accent-primary" />
                      )}
                      <span className="font-medium text-text-primary">
                        {evt.event_type}
                      </span>
                      {evt.albums?.title && (
                        <span className="text-text-muted">({evt.albums.title})</span>
                      )}
                    </div>
                    <span className="text-text-muted">{formatDate(evt.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "viewed" && (
          <div className="space-y-3">
            {viewed_albums.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No albums viewed yet.</p>
            ) : (
              viewed_albums.map((alb) => (
                <div key={alb.album_id} className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-border">
                  <div>
                    <span className="font-medium text-text-primary text-sm">{alb.title}</span>
                    <span className="text-xs text-text-muted block mt-0.5">Last viewed: {formatDate(alb.last_at)}</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-accent-primary/10 text-accent-primary">
                    {alb.count} views
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "downloads" && (
          <div className="space-y-3">
            {downloaded_albums.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No downloads recorded.</p>
            ) : (
              downloaded_albums.map((alb) => (
                <div key={alb.album_id} className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-border">
                  <div>
                    <span className="font-medium text-text-primary text-sm">{alb.title}</span>
                    <span className="text-xs text-text-muted block mt-0.5">Last downloaded: {formatDate(alb.last_at)}</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    {alb.count} downloads
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "timeline" && (
          <div className="space-y-2">
            {timeline.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No activity recorded.</p>
            ) : (
              timeline.map((evt) => (
                <div key={evt.id} className="flex items-start justify-between p-3 rounded-lg bg-background/30 border border-border/50 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{evt.event_type}</span>
                      {evt.albums?.title && (
                        <span className="text-text-muted">• {evt.albums.title}</span>
                      )}
                    </div>
                    {evt.source && <p className="text-text-muted text-[11px]">Source: {evt.source}</p>}
                  </div>
                  <span className="text-text-muted whitespace-nowrap">{formatDate(evt.created_at)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

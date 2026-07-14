"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Square, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UserGrantsPanelProps {
  userId: string;
  email?: string;
}

interface PrivateAlbumGrantOption {
  id: string;
  title: string;
}

interface UserAlbumGrant {
  scope: "all_private" | "selected_albums" | string;
  album_id: string | null;
}

export function UserGrantsPanel({ userId, email }: UserGrantsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [privateAlbums, setPrivateAlbums] = useState<PrivateAlbumGrantOption[]>([]);
  
  // Grant state
  const [scope, setScope] = useState<"all_private" | "selected_albums">("selected_albums");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all albums to find private ones
        // We can use the public albums API, but we might need all private albums even if not admin on client
        // Wait, the client is an admin, so they can fetch /api/albums?status=private
        const albumsRes = await fetch("/api/albums?status=private");
        const albumsPayload = await albumsRes.json();
        const albums = Array.isArray(albumsPayload) ? albumsPayload : (albumsPayload.data || []);
        setPrivateAlbums(albums);

        // Fetch user's grants
        const grantsRes = await fetch(`/api/studio/users/${userId}/grants`);
        const grantsPayload = await grantsRes.json();
        
        if (grantsPayload.success) {
          const grants = (grantsPayload.data.grants || []) as UserAlbumGrant[];
          const hasGlobal = grants.some((g) => g.scope === "all_private");
          if (hasGlobal) {
            setScope("all_private");
          } else {
            setScope("selected_albums");
            const ids = new Set<string>();
            grants.forEach((g) => {
              if (g.album_id) ids.add(g.album_id);
            });
            setSelectedIds(ids);
          }
        }
      } catch {
        setError("Failed to load access data.");
      }
      setLoading(false);
    }
    fetchData();
  }, [userId]);

  const toggleAlbum = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/studio/users/${userId}/grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          albumIds: Array.from(selectedIds),
          email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Access saved successfully.");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || "Failed to save.");
      }
    } catch {
      setError("Network error.");
    }
    setSaving(false);
  };

  const handleRevokeAll = async () => {
    setScope("selected_albums");
    setSelectedIds(new Set());
    // Immediately save
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/studio/users/${userId}/grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "selected_albums",
          albumIds: [],
          email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("All access revoked.");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || "Failed to revoke.");
      }
    } catch {
      setError("Network error.");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-text-secondary"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-text-primary text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" /> Private Album Permissions
        </h3>
        <p className="text-sm text-text-secondary">
          Grant this user explicit access to private albums. This unlocks the album when they are logged in.
        </p>
      </div>

      {error && <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-xl">{error}</div>}
      {success && <div className="p-3 bg-green-500/10 text-green-500 text-sm rounded-xl">{success}</div>}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setScope("all_private")}
          className={`p-4 rounded-[1rem] border text-left transition-all ${
            scope === "all_private" ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border bg-background hover:bg-surface"
          }`}
        >
          <div className="flex items-center gap-3">
            {scope === "all_private" ? <CheckSquare className="h-5 w-5 text-accent" /> : <Square className="h-5 w-5 text-text-secondary" />}
            <span className="font-semibold text-text-primary">All Private Albums</span>
          </div>
          <p className="mt-2 text-xs text-text-secondary">User can access all current and future private albums automatically.</p>
        </button>

        <button
          onClick={() => setScope("selected_albums")}
          className={`p-4 rounded-[1rem] border text-left transition-all ${
            scope === "selected_albums" ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border bg-background hover:bg-surface"
          }`}
        >
          <div className="flex items-center gap-3">
            {scope === "selected_albums" ? <CheckSquare className="h-5 w-5 text-accent" /> : <Square className="h-5 w-5 text-text-secondary" />}
            <span className="font-semibold text-text-primary">Selected Albums</span>
          </div>
          <p className="mt-2 text-xs text-text-secondary">User can only access specifically chosen private albums.</p>
        </button>
      </div>

      {scope === "selected_albums" && (
        <div className="rounded-[1rem] border border-border bg-background overflow-hidden">
          <div className="bg-surface/50 p-4 border-b border-border flex justify-between items-center">
            <span className="font-medium text-sm">Select Albums ({selectedIds.size} selected)</span>
            <div className="flex gap-2">
              <button onClick={() => setSelectedIds(new Set(privateAlbums.map(a => a.id)))} className="text-xs text-text-secondary hover:text-text-primary">Select All</button>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-text-secondary hover:text-text-primary">Clear</button>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {privateAlbums.length === 0 ? (
              <p className="p-4 text-center text-sm text-text-secondary">No private albums found.</p>
            ) : (
              privateAlbums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => toggleAlbum(album.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface text-left"
                >
                  <span className="text-sm text-text-primary">{album.title}</span>
                  {selectedIds.has(album.id) ? (
                    <CheckSquare className="h-4 w-4 text-accent" />
                  ) : (
                    <Square className="h-4 w-4 text-text-secondary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="secondary" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={handleRevokeAll} disabled={saving}>
          Revoke Access
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

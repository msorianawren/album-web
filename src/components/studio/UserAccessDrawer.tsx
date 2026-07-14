"use client";

import { useState, useEffect } from "react";
import { X, Shield, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AccessDrawerUser {
  id?: string | null;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  created_at?: string | null;
}

interface AccessDrawerGrant {
  id: string;
  scope: "all_private" | "selected_albums" | string;
  status: "active" | "revoked" | string;
  granted_at?: string | null;
  revoked_at?: string | null;
  revoke_reason?: string | null;
  albums?: { title?: string | null } | null;
}

interface AccessDrawerDetails {
  grants: AccessDrawerGrant[];
  requests: Array<{ id: string; status: string; created_at?: string | null }>;
}

interface PrivateAlbumOption {
  id: string;
  title: string;
}

function formatGrantDate(grant: AccessDrawerGrant) {
  const source = grant.granted_at || grant.revoked_at;
  return source ? new Date(source).toLocaleDateString() : "No date";
}

export function UserAccessDrawer({ user, onClose, onUpdate }: { user: AccessDrawerUser; onClose: () => void; onUpdate: () => void }) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<AccessDrawerDetails>({ grants: [], requests: [] });
  const [albums, setAlbums] = useState<PrivateAlbumOption[]>([]);

  // Form states
  const [action, setAction] = useState<"none" | "grant" | "revoke">("none");
  const [scope, setScope] = useState<"all_private" | "selected_albums">("selected_albums");
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/studio/access/users/${user.id || user.email}`);
        if (res.ok) {
          const json = await res.json();
          setDetails(json.data);
        }

        const permRes = await fetch("/api/studio/permissions");
        if (permRes.ok) {
          const permJson = await permRes.json();
          setAlbums(permJson.data?.privateAlbums || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [user.id, user.email]);

  const activeGrants = details.grants?.filter((g) => g.status === "active") || [];
  const revokedGrants = details.grants?.filter((g) => g.status === "revoked") || [];

  const handleToggleAlbum = (id: string) => {
    setSelectedAlbums(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (action === "grant") {
        await fetch(`/api/studio/users/${user.id || user.email}/grants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            albumIds: Array.from(selectedAlbums),
            email: user.email,
          }),
        });
      } else if (action === "revoke") {
        await fetch("/api/studio/access/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            scope,
            albumIds: Array.from(selectedAlbums),
            reason,
          }),
        });
      }
      onUpdate();
      setAction("none");
      setReason("");
      setSelectedAlbums(new Set());
      // Refresh details
      const res = await fetch(`/api/studio/access/users/${user.id || user.email}`);
      if (res.ok) {
        const json = await res.json();
        setDetails(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">User Access Details</h2>
            <p className="text-sm text-text-secondary">View and manage permissions</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* User Summary */}
          <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-border">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-lg text-text-primary">
                {(user.display_name || user.email || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold text-text-primary">{user.display_name || "Pending Registration"}</div>
              <div className="text-sm text-text-secondary">{user.email}</div>
              <div className="text-xs text-text-tertiary mt-1 capitalize">{user.role || "User"}</div>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-text-secondary py-8">Loading details...</div>
          ) : (
            <>
              {/* Current Access Summary */}
              <div>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Current Access</h3>
                
                {activeGrants.some((g) => g.scope === "all_private") ? (
                  <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-2 rounded-lg text-sm font-medium">
                    <Shield className="w-4 h-4" /> Has All Private Access
                  </div>
                ) : activeGrants.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-text-primary font-medium">{activeGrants.length} Selected Albums</p>
                    <div className="flex flex-wrap gap-2">
                      {activeGrants.map((g) => (
                        <span key={g.id} className="bg-background border px-2 py-1 rounded text-xs font-medium text-text-secondary">
                          {g.albums?.title || "Unknown Album"}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-text-secondary italic">No active access.</div>
                )}
              </div>

              {/* Action Buttons */}
              {action === "none" && (
                <div className="flex gap-3">
                  <Button onClick={() => setAction("grant")} className="flex-1 bg-accent text-accent-foreground">Grant Access</Button>
                  <Button onClick={() => setAction("revoke")} variant="ghost" className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-500/10">Revoke Access</Button>
                </div>
              )}

              {/* Action Form */}
              {action !== "none" && (
                <div className={cn("p-5 rounded-xl border border-border space-y-4", action === "revoke" ? "bg-red-500/5 border-red-500/20" : "bg-background")}>
                  <div className="flex items-center justify-between">
                    <h3 className={cn("font-semibold", action === "revoke" ? "text-red-500" : "text-accent")}>
                      {action === "grant" ? "Grant Access" : "Revoke Access"}
                    </h3>
                    <button onClick={() => setAction("none")} className="text-xs text-text-tertiary hover:text-text-primary">Cancel</button>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer bg-surface hover:bg-surface-hover">
                      <input 
                        type="radio" 
                        name="scope" 
                        value="all_private" 
                        checked={scope === "all_private"} 
                        onChange={() => setScope("all_private")} 
                        className={cn("mt-1", action === "revoke" ? "accent-red-500" : "accent-accent")}
                      />
                      <div>
                        <div className="text-sm font-medium text-text-primary">All Private Albums</div>
                        <div className="text-xs text-text-secondary">Apply to every current and future private album.</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer bg-surface hover:bg-surface-hover">
                      <input 
                        type="radio" 
                        name="scope" 
                        value="selected_albums" 
                        checked={scope === "selected_albums"} 
                        onChange={() => setScope("selected_albums")} 
                        className={cn("mt-1", action === "revoke" ? "accent-red-500" : "accent-accent")}
                      />
                      <div>
                        <div className="text-sm font-medium text-text-primary">Selected Albums</div>
                        <div className="text-xs text-text-secondary">Apply only to specific albums you choose.</div>
                      </div>
                    </label>
                  </div>

                  {scope === "selected_albums" && (
                    <div className="pt-2">
                      <div className="text-xs font-semibold text-text-secondary mb-2">Select Albums</div>
                      <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2 bg-surface">
                        {albums.map(a => (
                          <label key={a.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer hover:bg-background rounded">
                            <input 
                              type="checkbox" 
                              checked={selectedAlbums.has(a.id)} 
                              onChange={() => handleToggleAlbum(a.id)} 
                              className={cn("rounded", action === "revoke" ? "accent-red-500" : "accent-accent")}
                            />
                            <span className="text-text-primary truncate">{a.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {action === "revoke" && (
                    <div className="pt-2 space-y-1">
                      <label className="text-xs font-semibold text-text-secondary">Reason for Revocation (Optional)</label>
                      <input 
                        type="text" 
                        value={reason} 
                        onChange={e => setReason(e.target.value)} 
                        placeholder="e.g. Terms violation, Temporary block..." 
                        className="w-full text-sm p-2 rounded-lg border bg-surface text-text-primary outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  )}

                  {action === "revoke" && (
                    <div className="flex items-start gap-2 text-red-500 text-xs bg-red-500/10 p-3 rounded-lg">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>This will immediately remove access to the selected scope. The user will be blocked from viewing, downloading, and fetching media for the affected albums.</p>
                    </div>
                  )}

                  <Button 
                    onClick={handleSave} 
                    disabled={saving || (scope === "selected_albums" && selectedAlbums.size === 0)}
                    className={cn("w-full mt-4", action === "revoke" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-accent text-accent-foreground")}
                  >
                    {saving ? "Saving..." : action === "grant" ? "Save Access" : "Confirm Revoke"}
                  </Button>
                </div>
              )}

              {/* History Log */}
              {details.grants?.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Grant History</h3>
                  <div className="space-y-4">
                    {details.grants.map((g) => (
                      <div key={g.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-xs font-bold uppercase", g.status === "active" ? "text-green-500" : "text-red-500")}>
                            {g.status}
                          </span>
                          <span className="text-text-secondary text-xs">•</span>
                          <span className="text-text-secondary text-xs">{formatGrantDate(g)}</span>
                        </div>
                        <p className="text-text-primary mb-1">
                          {g.scope === "all_private" ? "All Private Albums" : `Selected Album: ${g.albums?.title || "Unknown"}`}
                        </p>
                        {g.status === "revoked" && g.revoke_reason && (
                          <p className="text-text-tertiary text-xs italic">&quot;{g.revoke_reason}&quot;</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </>
          )}

        </div>
      </div>
    </>
  );
}

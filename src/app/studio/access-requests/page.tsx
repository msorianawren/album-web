"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock, Edit2, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AccessRequest {
  id: string;
  album_id: string;
  requester_name: string;
  requester_email: string | null;
  requester_phone: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  albums?: { title: string };
}

interface UserProfile {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
}

interface AlbumInvite {
  id: string;
  email: string;
  album_id: string | null;
  is_global: boolean;
  created_at: string;
  albums?: { title: string };
}

interface Album {
  id: string;
  title: string;
}

export default function AccessRequestsPage() {
  const [activeTab, setActiveTab] = useState<"permissions" | "requests">("permissions");
  
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<AlbumInvite[]>([]);
  const [privateAlbums, setPrivateAlbums] = useState<Album[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit State
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editIsGlobal, setEditIsGlobal] = useState(false);
  const [editAlbumIds, setEditAlbumIds] = useState<Set<string>>(new Set());

  async function fetchData() {
    setLoading(true);
    try {
      const [reqRes, permRes] = await Promise.all([
        fetch("/api/studio/access-requests"),
        fetch("/api/studio/permissions")
      ]);
      
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData.requests || []);
      }
      if (permRes.ok) {
        const permData = await permRes.json();
        setUsers(permData.users || []);
        setInvites(permData.invites || []);
        setPrivateAlbums(permData.privateAlbums || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function updateRequest(id: string, status: "approved" | "rejected") {
    try {
      const res = await fetch(`/api/studio/access-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((req) => (req.id === id ? { ...req, status } : req)),
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleEditClick(email: string) {
    const userInvites = invites.filter(i => i.email.toLowerCase() === email.toLowerCase());
    const isGlobal = userInvites.some(i => i.is_global);
    const selectedIds = new Set(userInvites.filter(i => i.album_id).map(i => i.album_id as string));
    
    setEditingEmail(email);
    setEditIsGlobal(isGlobal);
    setEditAlbumIds(selectedIds);
  }

  function handleToggleAlbum(albumId: string) {
    setEditAlbumIds(prev => {
      const next = new Set(prev);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  }

  async function handleSavePermissions() {
    if (!editingEmail) return;
    setSaving(true);
    
    try {
      const payload = {
        email: editingEmail,
        is_global: editIsGlobal,
        album_ids: Array.from(editAlbumIds)
      };
      
      const res = await fetch("/api/studio/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        // Optimistically update the local state or just refetch
        const permRes = await fetch("/api/studio/permissions");
        if (permRes.ok) {
          const permData = await permRes.json();
          setInvites(permData.invites || []);
        }
        setEditingEmail(null);
      } else {
        alert("Failed to save permissions.");
      }
    } catch (err) {
      alert("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-text-secondary">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Access Management</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Manage permissions and requests for private albums.
        </p>
      </div>

      <div className="mb-6 flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("permissions")}
          className={`pb-3 text-sm font-medium ${
            activeTab === "permissions"
              ? "border-b-2 border-text-primary text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          User Permissions
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 text-sm font-medium flex items-center gap-2 ${
            activeTab === "requests"
              ? "border-b-2 border-text-primary text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Pending Requests
          {requests.filter(r => r.status === "pending").length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground font-bold">
              {requests.filter(r => r.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "permissions" && (
        <div className="grid gap-4">
          {users.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-text-secondary">
              No registered users found.
            </div>
          ) : (
            users.map((user) => {
              const userInvites = invites.filter(i => i.email.toLowerCase() === user.email.toLowerCase());
              const hasGlobal = userInvites.some(i => i.is_global);
              const albumsCount = userInvites.filter(i => !i.is_global && i.album_id).length;
              
              const isEditing = editingEmail === user.email;

              return (
                <div
                  key={user.user_id}
                  className="flex flex-col rounded-2xl border border-border bg-surface p-5 transition-all"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background border border-border text-sm font-bold text-text-secondary">
                          {(user.display_name || user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-medium text-text-primary">{user.display_name || "Unnamed User"}</h3>
                        <p className="text-xs text-text-secondary">{user.email}</p>
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-sm">
                          {hasGlobal ? (
                            <span className="rounded bg-accent/10 px-2.5 py-1 font-medium text-accent">All Private Albums</span>
                          ) : albumsCount > 0 ? (
                            <span className="rounded bg-background px-2.5 py-1 font-medium text-text-primary">{albumsCount} Albums</span>
                          ) : (
                            <span className="rounded bg-background px-2.5 py-1 font-medium text-text-tertiary">No Access</span>
                          )}
                        </div>
                        <Button variant="ghost" onClick={() => handleEditClick(user.email)} className="h-8 px-3 text-xs">
                          <Edit2 className="w-3 h-3 mr-2" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-6 border-t border-border pt-5">
                      <div className="mb-4">
                        <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-background/50 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={editIsGlobal}
                            onChange={(e) => setEditIsGlobal(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                          />
                          <div>
                            <p className="text-sm font-medium text-text-primary">All Private Albums</p>
                            <p className="text-xs text-text-secondary">Grant access to every current and future private album.</p>
                          </div>
                        </label>
                      </div>

                      {!editIsGlobal && privateAlbums.length > 0 && (
                        <div className="mb-4 space-y-2 pl-1">
                          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Specific Albums</p>
                          {privateAlbums.map(album => (
                            <label key={album.id} className="flex items-center gap-3 py-1 cursor-pointer group">
                              <input 
                                type="checkbox"
                                checked={editAlbumIds.has(album.id)}
                                onChange={() => handleToggleAlbum(album.id)}
                                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                              />
                              <span className="text-sm text-text-primary group-hover:text-accent transition-colors">{album.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {!editIsGlobal && privateAlbums.length === 0 && (
                        <p className="text-sm text-text-secondary mb-4">No private albums found in the system.</p>
                      )}

                      <div className="flex gap-3 justify-end mt-6">
                        <Button variant="ghost" onClick={() => setEditingEmail(null)} disabled={saving}>
                          Cancel
                        </Button>
                        <Button onClick={handleSavePermissions} disabled={saving} className="bg-accent text-accent-foreground">
                          {saving ? "Saving..." : "Save Permissions"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "requests" && (
        <div className="grid gap-4">
          {requests.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-text-secondary">
              No access requests found.
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-background px-2 py-1 text-xs font-semibold text-text-secondary uppercase">
                      {req.albums?.title || "Unknown Album"}
                    </span>
                    {req.status === "pending" && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-yellow-500 uppercase">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    )}
                    {req.status === "approved" && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-500 uppercase">
                        <Check className="h-3 w-3" /> Approved
                      </span>
                    )}
                    {req.status === "rejected" && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-500 uppercase">
                        <X className="h-3 w-3" /> Rejected
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-text-primary">{req.requester_name}</h3>
                  <div className="mt-1 flex gap-4 text-sm text-text-secondary">
                    {req.requester_email && <span>{req.requester_email}</span>}
                    <span>{req.requester_phone}</span>
                  </div>
                  <p className="mt-4 text-sm text-text-primary bg-background/50 p-3 rounded-xl border border-border">
                    &quot;{req.reason}&quot;
                  </p>
                  <div className="mt-3 text-xs text-text-secondary">
                    Requested on {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>

                {req.status === "pending" && (
                  <div className="flex shrink-0 gap-2 sm:flex-col">
                    <Button
                      onClick={() => updateRequest(req.id, "approved")}
                      className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => updateRequest(req.id, "rejected")}
                      variant="ghost"
                      className="flex-1 sm:flex-none text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

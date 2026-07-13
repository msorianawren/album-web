"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock, Plus, Trash2 } from "lucide-react";
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
  status: string;
}

export default function AccessRequestsPage() {
  const [activeTab, setActiveTab] = useState<"requests" | "invites">("requests");
  
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [invites, setInvites] = useState<AlbumInvite[]>([]);
  const [privateAlbums, setPrivateAlbums] = useState<Album[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAlbumId, setInviteAlbumId] = useState<string>("global");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const [reqRes, invRes, albRes] = await Promise.all([
        fetch("/api/studio/access-requests"),
        fetch("/api/studio/invites"),
        fetch("/api/albums")
      ]);
      
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData.requests || []);
      }
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvites(invData.invites || []);
      }
      if (albRes.ok) {
        const albData = await albRes.json();
        const privates = (albData.albums || []).filter((a: Album) => a.status === "private");
        setPrivateAlbums(privates);
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

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviting(true);
    
    try {
      const isGlobal = inviteAlbumId === "global";
      const payload = {
        email: inviteEmail,
        is_global: isGlobal,
        album_id: isGlobal ? null : inviteAlbumId
      };
      
      const res = await fetch("/api/studio/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error?.message || "Failed to create invite");
      } else {
        setInviteEmail("");
        // refresh invites
        const invRes = await fetch("/api/studio/invites");
        if (invRes.ok) {
          const invData = await invRes.json();
          setInvites(invData.invites || []);
        }
      }
    } catch (err) {
      setInviteError("An unexpected error occurred");
    } finally {
      setInviting(false);
    }
  }

  async function handleRevokeInvite(id: string) {
    if (!confirm("Are you sure you want to revoke this invite?")) return;
    
    try {
      const res = await fetch(`/api/studio/invites/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setInvites(prev => prev.filter(inv => inv.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-text-secondary">Loading access data...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Access Management</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Manage permissions and invites for private albums.
        </p>
      </div>

      <div className="mb-6 flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 text-sm font-medium ${
            activeTab === "requests"
              ? "border-b-2 border-text-primary text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Access Requests
        </button>
        <button
          onClick={() => setActiveTab("invites")}
          className={`pb-3 text-sm font-medium ${
            activeTab === "invites"
              ? "border-b-2 border-text-primary text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Direct Invites
        </button>
      </div>

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
                      variant="secondary"
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

      {activeTab === "invites" && (
        <div>
          <form onSubmit={handleCreateInvite} className="mb-8 rounded-2xl border border-border bg-surface p-5">
            <h3 className="mb-4 font-medium text-text-primary">Grant Access via Email</h3>
            
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="mb-2 block text-sm font-medium text-text-secondary">
                  Gmail Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-text-primary"
                />
              </div>
              
              <div className="flex-1 w-full">
                <label className="mb-2 block text-sm font-medium text-text-secondary">
                  Album Access
                </label>
                <select
                  value={inviteAlbumId}
                  onChange={(e) => setInviteAlbumId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-text-primary"
                >
                  <option value="global">All Private Albums</option>
                  {privateAlbums.map(album => (
                    <option key={album.id} value={album.id}>
                      {album.title}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" disabled={inviting || !inviteEmail} className="w-full sm:w-auto h-[42px]">
                <Plus className="mr-2 w-4 h-4" />
                {inviting ? "Inviting..." : "Add Invite"}
              </Button>
            </div>
            
            {inviteError && (
              <p className="mt-3 text-sm text-red-500">{inviteError}</p>
            )}
          </form>

          <div className="grid gap-4">
            <h3 className="font-medium text-text-primary mb-2">Active Invites</h3>
            
            {invites.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-text-secondary">
                No active email invites.
              </div>
            ) : (
              invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                >
                  <div>
                    <p className="font-medium text-text-primary">{inv.email}</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {inv.is_global ? "All Private Albums" : inv.albums?.title || "Unknown Album"}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      Added on {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revoke
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

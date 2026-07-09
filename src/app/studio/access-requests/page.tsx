"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock } from "lucide-react";
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

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/studio/access-requests");
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

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

  if (loading) {
    return <div className="p-8 text-center text-text-secondary">Loading requests...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Access Requests</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Manage permissions for private albums.
        </p>
      </div>

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
                  "{req.reason}"
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
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, Clock, Edit2, Shield, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UserAccessDrawer } from "@/components/studio/UserAccessDrawer";
import { cn } from "@/lib/utils";

interface PaginationData {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export default function AccessRequestsPage() {
  const [activeTab, setActiveTab] = useState<"permissions" | "requests" | "history">("permissions");
  
  // Data State
  const [users, setUsers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [grantFilter, setGrantFilter] = useState("all");

  // Drawer state
  const [drawerUser, setDrawerUser] = useState<any | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "permissions") {
        const query = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          search: debouncedSearch,
        });
        if (grantFilter !== "all") query.set("grantFilter", grantFilter);

        const res = await fetch(`/api/studio/access/users?${query.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setUsers(json.data?.rows || []);
          setPagination(json.data?.pagination || null);
        }
      } else if (activeTab === "history") {
        const query = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });
        const res = await fetch(`/api/studio/access/history?${query.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setHistory(json.data?.rows || []);
          setPagination(json.data?.pagination || null);
        }
      } else if (activeTab === "requests") {
        const res = await fetch("/api/studio/access-requests");
        if (res.ok) {
          const json = await res.json();
          setRequests(json.data?.requests || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, debouncedSearch, grantFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (pagination?.totalPages || 1)) {
      setPage(newPage);
    }
  };

  const approveRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/studio/access-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const rejectRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/studio/access-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="mx-auto max-w-7xl relative">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Access Management</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Manage private album access, view requests, and revoke permissions.
        </p>
      </div>

      <div className="mb-6 flex gap-4 border-b border-border justify-between items-center">
        <div className="flex gap-4">
          {[
            { id: "permissions", label: "User Permissions" },
            { id: "requests", label: "Pending Requests" },
            { id: "history", label: "Grant/Revoke History" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setPage(1); }}
              className={cn(
                "pb-3 text-sm font-medium transition-colors border-b-2",
                activeTab === tab.id
                  ? "border-text-primary text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.label}
              {tab.id === "requests" && requests.filter(r => r.status === "pending").length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground font-bold">
                  {requests.filter(r => r.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "permissions" && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-t-2xl border border-border">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm w-64 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <select
                value={grantFilter}
                onChange={e => { setGrantFilter(e.target.value); setPage(1); }}
                className="py-2 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none"
              >
                <option value="all">All Users</option>
                <option value="active">Currently Active</option>
                <option value="no_access">Currently No Access</option>
                <option value="ever_granted">Ever Granted</option>
                <option value="ever_revoked">Ever Revoked</option>
                <option value="revoked_only">Revoked Only</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              Rows: 
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="bg-transparent font-medium border-none outline-none">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-b-2xl border-x border-b border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-background/50 text-text-secondary border-b border-border">
                <tr>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Current Access</th>
                  <th className="p-4 font-medium">Pending</th>
                  <th className="p-4 font-medium">Last Grant</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-text-secondary">No users found.</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-background/50 transition-colors cursor-pointer group" onClick={() => setDrawerUser(u)}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? <img src={u.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" /> : <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center font-bold text-xs">{(u.display_name || u.email || "?")[0].toUpperCase()}</div>}
                          <div>
                            <div className="font-medium text-text-primary">{u.display_name || "Pending Registration"}</div>
                            <div className="text-xs text-text-tertiary">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {u.current_access === "All Private Albums" ? (
                          <span className="rounded bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">All Private</span>
                        ) : u.current_access.includes("Selected") ? (
                          <div className="flex flex-col">
                            <span className="rounded bg-background border px-2 py-1 text-xs font-semibold text-text-primary">{u.current_access}</span>
                          </div>
                        ) : u.current_access === "Revoked" ? (
                          <span className="rounded bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-500">Revoked</span>
                        ) : (
                          <span className="text-text-tertiary">No Access</span>
                        )}
                      </td>
                      <td className="p-4">
                        {u.pending_requests > 0 ? <span className="text-yellow-500 font-bold">{u.pending_requests} reqs</span> : "-"}
                      </td>
                      <td className="p-4 text-text-secondary">
                        {u.last_grant > 0 ? new Date(u.last_grant).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" className="h-8 px-2 group-hover:bg-background">
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border bg-background/50">
                <div className="text-sm text-text-secondary">
                  Showing {(page - 1) * pageSize + 1} to Math.min(page * pageSize, pagination.totalRows) of {pagination.totalRows}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" className="w-8 h-8 p-0" disabled={!pagination.hasPrevious} onClick={() => handlePageChange(1)}><ChevronsLeft className="w-4 h-4" /></Button>
                  <Button variant="ghost" className="w-8 h-8 p-0" disabled={!pagination.hasPrevious} onClick={() => handlePageChange(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <div className="px-3 text-sm font-medium">{page} / {pagination.totalPages}</div>
                  <Button variant="ghost" className="w-8 h-8 p-0" disabled={!pagination.hasNext} onClick={() => handlePageChange(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
                  <Button variant="ghost" className="w-8 h-8 p-0" disabled={!pagination.hasNext} onClick={() => handlePageChange(pagination.totalPages)}><ChevronsRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "requests" && (
        <div className="grid gap-4">
          {requests.map(req => (
            <div key={req.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded bg-background px-2 py-1 text-xs font-semibold text-text-secondary uppercase">{req.albums?.title || "Unknown Album"}</span>
                  {req.status === "pending" && <span className="flex items-center gap-1 text-xs font-semibold text-yellow-500 uppercase"><Clock className="h-3 w-3" /> Pending</span>}
                  {req.status === "approved" && <span className="flex items-center gap-1 text-xs font-semibold text-green-500 uppercase"><Check className="h-3 w-3" /> Approved</span>}
                  {req.status === "rejected" && <span className="flex items-center gap-1 text-xs font-semibold text-red-500 uppercase"><X className="h-3 w-3" /> Rejected</span>}
                </div>
                <h3 className="text-lg font-medium text-text-primary">{req.requester_name}</h3>
                <div className="mt-1 flex gap-4 text-sm text-text-secondary">
                  {req.requester_email && <span>{req.requester_email}</span>}
                  <span>{req.requester_phone}</span>
                </div>
                <p className="mt-4 text-sm text-text-primary bg-background/50 p-3 rounded-xl border border-border">&quot;{req.reason}&quot;</p>
              </div>
              {req.status === "pending" && (
                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <Button onClick={() => approveRequest(req.id)} className="bg-green-500 hover:bg-green-600 text-white">Approve</Button>
                  <Button onClick={() => rejectRequest(req.id)} variant="ghost" className="text-red-500">Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "history" && (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/50 text-text-secondary border-b border-border">
              <tr>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Action</th>
                <th className="p-4 font-medium">Scope</th>
                <th className="p-4 font-medium">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map(row => (
                <tr key={row.id}>
                  <td className="p-4 text-text-secondary">{new Date(row.updated_at || row.granted_at || row.revoked_at || Date.now()).toLocaleString()}</td>
                  <td className="p-4 font-medium">{row.display_name || row.email}</td>
                  <td className="p-4">
                    {row.status === "active" ? (
                      <span className="text-green-500 font-semibold">Granted</span>
                    ) : (
                      <span className="text-red-500 font-semibold">Revoked</span>
                    )}
                  </td>
                  <td className="p-4 text-text-secondary">
                    {row.scope === "all_private" ? "All Private" : row.album?.title || "Selected Albums"}
                  </td>
                  <td className="p-4 text-text-tertiary">{row.status === "active" ? row.granted_by : row.revoked_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-background/50">
              <Button variant="ghost" disabled={!pagination.hasPrevious} onClick={() => handlePageChange(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm">{page} / {pagination.totalPages}</span>
              <Button variant="ghost" disabled={!pagination.hasNext} onClick={() => handlePageChange(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      )}

      {drawerUser && (
        <UserAccessDrawer user={drawerUser} onClose={() => setDrawerUser(null)} onUpdate={() => fetchData()} />
      )}
    </div>
  );
}

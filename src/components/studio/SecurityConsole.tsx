"use client";

import { useMemo, useState, useEffect } from "react";
import { Ban, CheckCircle2, Crown, Search, ShieldAlert, ShieldCheck, UserCog, Activity, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { UserActivityPanel } from "./UserActivityPanel";
import { cn } from "@/lib/utils";
import type { AuditLog, PublicSession, UserProfile, UserRole } from "@/lib/types";

interface SecurityConsoleProps {
  initialUsers: UserProfile[];
  initialTotalUsers: number;
  initialLogs: AuditLog[];
  initialTotalLogs: number;
  initialRoleLogs: AuditLog[];
  session: PublicSession;
}

type RoleAction = {
  type: "grant" | "revoke";
  user: UserProfile;
} | null;

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function roleOf(user: UserProfile): UserRole {
  return user.role ?? "user";
}

function roleBadgeClass(role: UserRole) {
  if (role === "founder") return "border-amber-400/35 bg-amber-200/25 text-text-primary";
  if (role === "admin") return "border-muted-accent/35 bg-muted-accent/15 text-text-primary";
  return "border-border bg-background/70 text-text-secondary";
}

function roleLabel(role: UserRole) {
  if (role === "founder") return "Founder";
  if (role === "admin") return "Admin";
  if (role === "guest") return "Guest";
  return "User";
}

function actionLabel(action: string) {
  return action
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function metadataText(log: AuditLog, key: string) {
  const value = log.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function Pagination({ page, totalPages, onPageChange, isLoading }: { page: number, totalPages: number, onPageChange: (p: number) => void, isLoading: boolean }) {
  const maxPage = Math.max(1, totalPages);
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={() => onPageChange(1)} disabled={page <= 1 || isLoading} className="w-10 h-10 p-0"><ChevronsLeft className="h-4 w-4" /></Button>
      <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || isLoading} className="w-10 h-10 p-0"><ChevronLeft className="h-4 w-4" /></Button>
      <span className="text-sm font-medium px-4 text-text-secondary">Page {page} of {maxPage}</span>
      <Button variant="secondary" onClick={() => onPageChange(page + 1)} disabled={page >= maxPage || isLoading} className="w-10 h-10 p-0"><ChevronRight className="h-4 w-4" /></Button>
      <Button variant="secondary" onClick={() => onPageChange(maxPage)} disabled={page >= maxPage || isLoading} className="w-10 h-10 p-0"><ChevronsRight className="h-4 w-4" /></Button>
    </div>
  );
}

export function SecurityConsole({
  initialUsers,
  initialTotalUsers,
  initialLogs,
  initialTotalLogs,
  initialRoleLogs,
  session,
}: SecurityConsoleProps) {
  const USERS_LIMIT = 30;
  const LOGS_LIMIT = 50;

  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");

  // Users State
  const [users, setUsers] = useState(initialUsers);
  const [totalUsers, setTotalUsers] = useState(initialTotalUsers);
  const [userPage, setUserPage] = useState(1);
  const [userFilter, setUserFilter] = useState<"all" | "admins" | "blocked">("all");
  const [search, setSearch] = useState("");
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  
  // Logs State
  const [logs, setLogs] = useState(initialLogs);
  const [totalLogs, setTotalLogs] = useState(initialTotalLogs);
  const [logPage, setLogPage] = useState(1);
  const [logFilter, setLogFilter] = useState<"all" | "roles">("all");
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Common UI State
  const [message, setMessage] = useState("");
  const [roleAction, setRoleAction] = useState<RoleAction>(null);
  const [isRoleUpdating, setIsRoleUpdating] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const usersById = useMemo(() => {
    return users.reduce<Record<string, UserProfile>>((acc, user) => {
      acc[user.user_id] = user;
      return acc;
    }, {});
  }, [users]);

  // Fetch Users Effect
  useEffect(() => {
    async function fetchUsers() {
      if (!session.isFounder) return;
      setIsUsersLoading(true);
      try {
        const response = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}&page=${userPage}&limit=${USERS_LIMIT}&filter=${userFilter}`);
        const payload = await response.json();
        if (payload.success) {
          setUsers(payload.data.users);
          setTotalUsers(payload.data.count);
        } else {
          setMessage(payload.message ?? "Failed to fetch users.");
        }
      } catch (err) {
        setMessage("Network error fetching users.");
      }
      setIsUsersLoading(false);
    }
    // Only fetch if we are not on the initial render state for page 1 without search/filter
    if (userPage !== 1 || search !== "" || userFilter !== "all") {
      fetchUsers();
    }
  }, [userPage, userFilter, session.isFounder]); // We intentionally do not trigger on 'search' until they press Enter

  // Trigger user search manually on button/enter
  async function triggerUserSearch() {
    setUserPage(1);
    if (userPage === 1) {
      if (!session.isFounder) return;
      setIsUsersLoading(true);
      setMessage("Searching users...");
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}&page=1&limit=${USERS_LIMIT}&filter=${userFilter}`);
      const payload = await response.json();
      setIsUsersLoading(false);
      if (payload.success) {
        setUsers(payload.data.users);
        setTotalUsers(payload.data.count);
        setMessage(payload.data.users.length ? "User list updated." : "No matching users.");
      } else {
        setMessage(payload.message ?? "Search failed.");
      }
    }
  }

  // Fetch Logs Effect
  useEffect(() => {
    async function fetchLogs() {
      if (!session.isFounder) return;
      setIsLogsLoading(true);
      try {
        const response = await fetch(`/api/admin/audit-logs?page=${logPage}&limit=${LOGS_LIMIT}&filter=${logFilter}`);
        const payload = await response.json();
        if (payload.success) {
          setLogs(payload.data.logs);
          setTotalLogs(payload.data.count);
        } else {
          setMessage(payload.message ?? "Failed to fetch logs.");
        }
      } catch (err) {
        setMessage("Network error fetching logs.");
      }
      setIsLogsLoading(false);
    }
    // If not initial logs state
    if (logPage !== 1 || logFilter !== "all") {
      fetchLogs();
    }
  }, [logPage, logFilter, session.isFounder]);

  function mergeUser(updated: UserProfile) {
    setUsers((current) =>
      current.map((user) => (user.user_id === updated.user_id ? { ...user, ...updated } : user)),
    );
  }

  async function updateUser(userId: string, isBlocked: boolean) {
    setMessage("Updating user...");
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_blocked: isBlocked,
        blocked_reason: reasons[userId],
      }),
    });
    const payload = await response.json();

    if (payload.success) {
      mergeUser(payload.data.user);
      setMessage(isBlocked ? "User blocked." : "User unblocked.");
    } else {
      setMessage(payload.message ?? "Update failed.");
    }
  }

  async function confirmRoleAction() {
    if (!roleAction) return;
    setIsRoleUpdating(true);
    setMessage(roleAction.type === "grant" ? "Granting admin rights..." : "Revoking admin rights...");
    const endpoint =
      roleAction.type === "grant"
        ? `/api/admin/users/${roleAction.user.user_id}/grant-admin`
        : `/api/admin/users/${roleAction.user.user_id}/revoke-admin`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason:
          roleAction.type === "grant"
            ? "Founder granted admin rights from Security Console."
            : "Founder revoked admin rights from Security Console.",
      }),
    });
    const payload = await response.json();
    setIsRoleUpdating(false);

    if (payload.success) {
      mergeUser(payload.data.user);
      setRoleAction(null);
      setMessage(roleAction.type === "grant" ? "Admin rights granted." : "Admin rights revoked.");
    } else {
      setMessage(payload.message ?? "Role update failed.");
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
            Security Console
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-text-primary">
            Access & Logs
          </h1>
          <p className="mt-1 text-sm text-text-secondary" aria-live="polite">
            {message || "Review Google accounts and inspect system activity."}
          </p>
        </div>
        <div className="flex bg-background/50 p-1 rounded-full border border-border self-start">
          <Button
            variant={activeTab === "users" ? "primary" : "ghost"}
            onClick={() => setActiveTab("users")}
            className="rounded-full px-6"
          >
            <Users className="h-4 w-4 mr-2" /> Users
          </Button>
          <Button
            variant={activeTab === "logs" ? "primary" : "ghost"}
            onClick={() => setActiveTab("logs")}
            className="rounded-full px-6"
          >
            <FileText className="h-4 w-4 mr-2" /> Audit Logs
          </Button>
        </div>
      </section>

      {!session.isFounder ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/65 p-5 text-sm leading-6 text-text-secondary">
          <p className="font-semibold text-text-primary">Permission denied</p>
          This account can use normal admin tools, but it cannot view security tables or grant admin rights.
        </div>
      ) : activeTab === "users" ? (
        <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5 min-h-[500px]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
            <div className="flex items-center gap-2 border-b border-border">
              {(["all", "admins", "blocked"] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => { setUserFilter(filter); setUserPage(1); }}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold capitalize border-b-2 transition-colors",
                    userFilter === filter ? "border-text-primary text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  {filter} Users
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative min-w-0 flex-1 lg:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void triggerUserSearch();
                  }}
                  placeholder="Search users..."
                  className="pl-9 h-10"
                />
              </div>
              <Button variant="secondary" onClick={triggerUserSearch} disabled={isUsersLoading}>
                {isUsersLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-text-secondary">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 pr-4">Role</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Nguồn</th>
                  <th className="py-3 pr-4">Last seen</th>
                  <th className="py-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={cn("transition-opacity", isUsersLoading && "opacity-50")}>
                {users.map((user) => {
                  const role = roleOf(user);
                  return (
                    <tr key={user.user_id} className="border-b border-border/70 align-top">
                      <td className="py-3 pr-4">
                        <button 
                          onClick={() => setSelectedUserId(user.user_id)}
                          className="font-semibold text-text-primary hover:text-accent text-left transition-colors cursor-pointer"
                        >
                          {user.display_name ?? user.email}
                        </button>
                        <p className="mt-1 text-xs text-text-secondary">{user.email}</p>
                        <p className="mt-1 font-mono text-[0.68rem] text-text-secondary">{user.user_id}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]", roleBadgeClass(role))}>
                          {roleLabel(role)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {user.is_blocked ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500">
                            <Ban className="h-3 w-3" /> Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        )}
                        {user.blocked_reason && (
                          <p className="mt-1 max-w-[12rem] truncate text-[0.7rem] text-text-secondary" title={user.blocked_reason}>
                            {user.blocked_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-text-secondary capitalize">{user.registration_source || "-"}</td>
                      <td className="py-3 pr-4 text-text-secondary">{formatDate(user.last_seen_at)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          <Input
                            value={reasons[user.user_id] ?? user.blocked_reason ?? ""}
                            onChange={(event) =>
                              setReasons((current) => ({
                                ...current,
                                [user.user_id]: event.target.value,
                              }))
                            }
                            placeholder="Reason"
                            disabled={user.user_id === session.userId || role === "founder"}
                            className="w-32 h-8 text-xs"
                          />
                          {user.is_blocked ? (
                            <Button variant="secondary" onClick={() => updateUser(user.user_id, false)} className="h-8 px-3 text-xs">
                              Unblock
                            </Button>
                          ) : (
                            <Button variant="secondary" onClick={() => updateUser(user.user_id, true)} disabled={user.user_id === session.userId || role === "founder"} className="h-8 px-3 text-xs">
                              Block
                            </Button>
                          )}
                          
                          {role === "user" || role === "guest" ? (
                            <Button variant="secondary" onClick={() => setRoleAction({ type: "grant", user })} className="h-8 px-3 text-xs">
                              <ShieldCheck className="h-3 w-3 mr-1.5" /> Grant
                            </Button>
                          ) : role === "admin" ? (
                            <Button variant="secondary" onClick={() => setRoleAction({ type: "revoke", user })} className="h-8 px-3 text-xs">
                              <UserCog className="h-3 w-3 mr-1.5" /> Revoke
                            </Button>
                          ) : (
                            <Button variant="secondary" disabled className="h-8 px-3 text-xs">
                              <Crown className="h-3 w-3 mr-1.5" /> Founder
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!users.length && !isUsersLoading && (
              <p className="rounded-2xl border border-dashed border-border bg-background/60 p-6 mt-4 text-sm text-text-secondary text-center">
                No users match the current filter.
              </p>
            )}
          </div>
          
          <div className="mt-6 flex justify-between items-center border-t border-border pt-4">
            <p className="text-sm text-text-secondary">Showing {(userPage - 1) * USERS_LIMIT + 1} - {Math.min(userPage * USERS_LIMIT, totalUsers)} of {totalUsers} users</p>
            <Pagination page={userPage} totalPages={Math.ceil(totalUsers / USERS_LIMIT)} onPageChange={setUserPage} isLoading={isUsersLoading} />
          </div>
        </section>
      ) : (
        <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5 min-h-[500px]">
           <div className="flex items-center gap-2 border-b border-border mb-6">
            {(["all", "roles"] as const).map(filter => (
              <button
                key={filter}
                onClick={() => { setLogFilter(filter); setLogPage(1); }}
                className={cn(
                  "px-4 py-2 text-sm font-semibold capitalize border-b-2 transition-colors",
                  logFilter === filter ? "border-text-primary text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
                )}
              >
                {filter === "all" ? "All Activity" : "Role Changes"}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-text-secondary">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4">Time</th>
                  <th className="py-3 pr-4">Actor</th>
                  <th className="py-3 pr-4">Target / Action</th>
                  <th className="py-3 pr-4">Details</th>
                  <th className="py-3 pr-4">IP</th>
                </tr>
              </thead>
              <tbody className={cn("transition-opacity", isLogsLoading && "opacity-50")}>
                {logs.map((log) => {
                  const targetId = log.target_id ?? metadataText(log, "target_user_id");
                  return (
                    <tr key={log.id} className="border-b border-border/70 align-top">
                      <td className="py-3 pr-4 text-text-secondary whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-3 pr-4 text-text-primary">
                        {log.actor_email ?? "Unknown"}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-text-primary">{actionLabel(log.action)}</p>
                        {targetId && (
                           <p className="mt-1 text-xs text-text-secondary">Target: {usersById[targetId]?.email ?? targetId}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-text-secondary">
                        <p className="truncate max-w-[200px]">
                          {log.method ? `${log.method} ` : ""}
                          {log.path ?? "-"}
                        </p>
                        {metadataText(log, "result") && (
                           <p className="mt-1 text-xs font-medium">Result: {metadataText(log, "result")}</p>
                        )}
                         {metadataText(log, "failure_reason") && (
                           <p className="mt-1 text-xs text-red-500">Error: {metadataText(log, "failure_reason")}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-text-secondary font-mono text-[0.7rem]">
                        {log.ip_address ?? "-"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
             {!logs.length && !isLogsLoading && (
              <p className="rounded-2xl border border-dashed border-border bg-background/60 p-6 mt-4 text-sm text-text-secondary text-center">
                No logs match the current filter.
              </p>
            )}
          </div>
          
           <div className="mt-6 flex justify-between items-center border-t border-border pt-4">
            <p className="text-sm text-text-secondary">Showing {(logPage - 1) * LOGS_LIMIT + 1} - {Math.min(logPage * LOGS_LIMIT, totalLogs)} of {totalLogs} logs</p>
            <Pagination page={logPage} totalPages={Math.ceil(totalLogs / LOGS_LIMIT)} onPageChange={setLogPage} isLoading={isLogsLoading} />
          </div>
        </section>
      )}

      <Modal
        open={Boolean(roleAction)}
        title={roleAction?.type === "grant" ? "Grant admin rights" : "Revoke admin rights"}
        onClose={() => {
          if (!isRoleUpdating) setRoleAction(null);
        }}
      >
        {roleAction ? (
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-text-secondary">
              {roleAction.type === "grant"
                ? "This user will receive full operational access to Studio albums, media, comments, settings, downloads, and analytics."
                : "This user will lose normal Studio admin access after their session refreshes."}
            </p>
            <div className="rounded-2xl border border-border bg-surface/75 p-4">
              <p className="font-semibold text-text-primary">
                {roleAction.user.display_name ?? roleAction.user.email}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{roleAction.user.email}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setRoleAction(null)} disabled={isRoleUpdating}>
                Cancel
              </Button>
              <Button onClick={confirmRoleAction} disabled={isRoleUpdating}>
                {roleAction.type === "grant" ? "Grant Admin" : "Revoke Admin"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {selectedUserId && (
        <UserActivityPanel 
          userId={selectedUserId} 
          onClose={() => setSelectedUserId(null)} 
        />
      )}
    </div>
  );
}

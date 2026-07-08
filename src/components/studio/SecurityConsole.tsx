"use client";

import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Crown, Search, ShieldAlert, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { AuditLog, PublicSession, UserProfile, UserRole } from "@/lib/types";

interface SecurityConsoleProps {
  initialUsers: UserProfile[];
  initialLogs: AuditLog[];
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

export function SecurityConsole({
  initialUsers,
  initialLogs,
  initialRoleLogs,
  session,
}: SecurityConsoleProps) {
  const [users, setUsers] = useState(initialUsers);
  const [roleLogs, setRoleLogs] = useState(initialRoleLogs);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [roleAction, setRoleAction] = useState<RoleAction>(null);
  const [isRoleUpdating, setIsRoleUpdating] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const blockedUsers = users.filter((user) => user.is_blocked);
  const currentAdmins = users.filter((user) => ["founder", "admin"].includes(roleOf(user)));

  const usersById = useMemo(() => {
    return users.reduce<Record<string, UserProfile>>((acc, user) => {
      acc[user.user_id] = user;
      return acc;
    }, {});
  }, [users]);

  const orderedUsers = useMemo(() => {
    return [...users].sort((left, right) => {
      const leftRole = roleOf(left);
      const rightRole = roleOf(right);
      const weight = { founder: 0, admin: 1, user: 2, guest: 3 };
      if (weight[leftRole] !== weight[rightRole]) return weight[leftRole] - weight[rightRole];
      if (left.is_blocked !== right.is_blocked) return left.is_blocked ? -1 : 1;
      return new Date(right.last_seen_at).getTime() - new Date(left.last_seen_at).getTime();
    });
  }, [users]);

  function mergeUser(updated: UserProfile) {
    setUsers((current) =>
      current.map((user) => (user.user_id === updated.user_id ? { ...user, ...updated } : user)),
    );
  }

  async function searchUsers() {
    if (!session.isFounder) return;
    setIsSearching(true);
    setMessage("Searching users...");
    const response = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}`);
    const payload = await response.json();
    setIsSearching(false);

    if (payload.success) {
      setUsers(payload.data.users);
      setRoleLogs(payload.data.roleLogs);
      setMessage(payload.data.users.length ? "User list updated." : "No matching users.");
    } else {
      setMessage(payload.message ?? "Search failed.");
    }
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
      await searchUsers();
      setMessage(roleAction.type === "grant" ? "Admin rights granted." : "Admin rights revoked.");
    } else {
      setMessage(payload.message ?? "Role update failed.");
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
          Security
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-text-primary">
          User access and audit logs
        </h1>
        <p className="mt-3 text-text-secondary">
          Review Google accounts, block harmful behavior, inspect activity, and manage admin access.
        </p>
        <p className="mt-4 text-sm text-text-secondary" aria-live="polite">
          {message}
        </p>
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Crown className="mt-1 h-5 w-5 text-text-secondary" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Admin Management
              </p>
              <h2 className="text-2xl font-semibold text-text-primary">
                Founder-controlled admin roles
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                Admins can manage albums, media, comments, settings, downloads, analytics, and normal Studio tasks.
                Only the Founder can grant or revoke admin access.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{currentAdmins.length}</span> privileged account
            {currentAdmins.length === 1 ? "" : "s"}
          </div>
        </div>

        {!session.isFounder ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-background/65 p-5 text-sm leading-6 text-text-secondary">
            <p className="font-semibold text-text-primary">Permission denied</p>
            This account can use normal admin tools, but it cannot grant or revoke admin rights. Founder-only APIs
            also block direct calls from this account.
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void searchUsers();
                  }}
                  placeholder="Search by email, display name, or user ID"
                  className="pl-11"
                />
              </div>
              <Button variant="secondary" onClick={searchUsers} disabled={isSearching}>
                <Search className="h-4 w-4" aria-hidden="true" />
                {isSearching ? "Searching" : "Search"}
              </Button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-text-secondary">
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4">User</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Promoted</th>
                    <th className="py-3 pr-4">Revoked</th>
                    <th className="py-3 pr-4">Last seen</th>
                    <th className="py-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedUsers.map((user) => {
                    const role = roleOf(user);
                    const promotedBy = user.promoted_by ? usersById[user.promoted_by]?.email ?? user.promoted_by : "-";
                    const revokedBy = user.revoked_by ? usersById[user.revoked_by]?.email ?? user.revoked_by : "-";
                    return (
                      <tr key={user.user_id} className="border-b border-border/70 align-top">
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-text-primary">{user.display_name ?? user.email}</p>
                          <p className="mt-1 text-xs text-text-secondary">{user.email}</p>
                          <p className="mt-1 font-mono text-[0.68rem] text-text-secondary">{user.user_id}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]", roleBadgeClass(role))}>
                            {roleLabel(role)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-text-secondary">
                          <p>{formatDate(user.promoted_at)}</p>
                          <p className="mt-1 max-w-[12rem] truncate text-xs">{promotedBy}</p>
                        </td>
                        <td className="py-3 pr-4 text-text-secondary">
                          <p>{formatDate(user.revoked_at)}</p>
                          <p className="mt-1 max-w-[12rem] truncate text-xs">{revokedBy}</p>
                        </td>
                        <td className="py-3 pr-4 text-text-secondary">{formatDate(user.last_seen_at)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex justify-end gap-2">
                            {role === "user" || role === "guest" ? (
                              <Button variant="secondary" onClick={() => setRoleAction({ type: "grant", user })}>
                                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                                Grant Admin
                              </Button>
                            ) : role === "admin" ? (
                              <Button variant="secondary" onClick={() => setRoleAction({ type: "revoke", user })}>
                                <UserCog className="h-4 w-4" aria-hidden="true" />
                                Revoke
                              </Button>
                            ) : (
                              <Button variant="secondary" disabled>
                                <Crown className="h-4 w-4" aria-hidden="true" />
                                Protected
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!orderedUsers.length ? (
                <p className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-sm text-text-secondary">
                  No users match this search.
                </p>
              ) : null}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="flex items-center gap-3">
          <Ban className="h-5 w-5 text-text-secondary" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
              Blocked accounts
            </p>
            <h2 className="text-2xl font-semibold text-text-primary">
              {blockedUsers.length} account{blockedUsers.length === 1 ? "" : "s"} blocked
            </h2>
          </div>
        </div>
        {blockedUsers.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {blockedUsers.map((user) => (
              <article key={user.user_id} className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text-primary">
                      {user.display_name ?? user.email}
                    </p>
                    <p className="mt-1 truncate text-sm text-text-secondary">{user.email}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-secondary">
                      Blocked {formatDate(user.blocked_at)}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => updateUser(user.user_id, false)}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Unblock
                  </Button>
                </div>
                <p className="mt-3 rounded-xl border border-border bg-surface/70 p-3 text-sm leading-6 text-text-secondary">
                  {user.blocked_reason ?? "No reason recorded."}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-border bg-background/60 p-6 text-sm text-text-secondary">
            No blocked accounts right now.
          </p>
        )}
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-text-secondary" aria-hidden="true" />
          <h2 className="text-2xl font-semibold text-text-primary">
            Google users
          </h2>
        </div>
        <div className="mt-6 grid gap-4">
          {orderedUsers.map((user) => {
            const role = roleOf(user);
            return (
              <article
                key={user.user_id}
                className="grid gap-4 rounded-2xl border border-border bg-background/70 p-4 lg:grid-cols-[1fr_320px_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text-primary">
                      {user.display_name ?? user.email}
                    </p>
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em]", roleBadgeClass(role))}>
                      {roleLabel(role)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{user.email}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-secondary">
                    {user.is_blocked ? "Blocked" : "Allowed"} - Last seen{" "}
                    {formatDate(user.last_seen_at)}
                  </p>
                  {user.blocked_reason ? (
                    <p className="mt-2 text-sm italic text-text-secondary">
                      {user.blocked_reason}
                    </p>
                  ) : null}
                </div>
                <Input
                  value={reasons[user.user_id] ?? user.blocked_reason ?? ""}
                  onChange={(event) =>
                    setReasons((current) => ({
                      ...current,
                      [user.user_id]: event.target.value,
                    }))
                  }
                  placeholder="Block reason"
                  disabled={user.user_id === session.userId || role === "founder"}
                />
                {user.is_blocked ? (
                  <Button
                    variant="secondary"
                    onClick={() => updateUser(user.user_id, false)}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Unblock
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => updateUser(user.user_id, true)}
                    disabled={user.user_id === session.userId || role === "founder"}
                  >
                    <Ban className="h-4 w-4" aria-hidden="true" />
                    Block
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <h2 className="text-2xl font-semibold text-text-primary">
          Recent role changes
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-text-secondary">
              <tr className="border-b border-border">
                <th className="py-3 pr-4">Time</th>
                <th className="py-3 pr-4">Actor</th>
                <th className="py-3 pr-4">Target</th>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Result</th>
              </tr>
            </thead>
            <tbody>
              {roleLogs.map((log) => {
                const targetId = log.target_id ?? metadataText(log, "target_user_id");
                const target = targetId ? usersById[targetId] : null;
                return (
                  <tr key={log.id} className="border-b border-border/70">
                    <td className="py-3 pr-4 text-text-secondary">{formatDate(log.created_at)}</td>
                    <td className="py-3 pr-4 text-text-primary">{log.actor_email ?? "Unknown"}</td>
                    <td className="py-3 pr-4 text-text-secondary">{target?.email ?? targetId ?? "-"}</td>
                    <td className="py-3 pr-4 text-text-primary">{actionLabel(log.action)}</td>
                    <td className="py-3 pr-4 text-text-secondary">
                      {metadataText(log, "result") ?? "-"}
                      {metadataText(log, "failure_reason") ? ` - ${metadataText(log, "failure_reason")}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!roleLogs.length ? (
            <p className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-sm text-text-secondary">
              No role changes have been recorded yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <h2 className="text-2xl font-semibold text-text-primary">
          Recent activity
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-text-secondary">
              <tr className="border-b border-border">
                <th className="py-3 pr-4">Time</th>
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Path</th>
                <th className="py-3 pr-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {initialLogs.map((log) => (
                <tr key={log.id} className="border-b border-border/70">
                  <td className="py-3 pr-4 text-text-secondary">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="py-3 pr-4 text-text-primary">
                    {log.actor_email ?? "Unknown"}
                  </td>
                  <td className="py-3 pr-4 text-text-primary">{log.action}</td>
                  <td className="py-3 pr-4 text-text-secondary">
                    {log.method ? `${log.method} ` : ""}
                    {log.path ?? "-"}
                  </td>
                  <td className="py-3 pr-4 text-text-secondary">
                    {log.ip_address ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
    </div>
  );
}

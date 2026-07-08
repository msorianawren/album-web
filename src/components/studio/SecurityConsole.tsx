"use client";

import { useState } from "react";
import { Ban, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AuditLog, UserProfile } from "@/lib/types";

interface SecurityConsoleProps {
  initialUsers: UserProfile[];
  initialLogs: AuditLog[];
  adminUserId: string;
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SecurityConsole({
  initialUsers,
  initialLogs,
  adminUserId,
}: SecurityConsoleProps) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const blockedUsers = users.filter((user) => user.is_blocked);
  const orderedUsers = [...users].sort((left, right) => {
    if (left.is_blocked !== right.is_blocked) return left.is_blocked ? -1 : 1;
    return new Date(right.last_seen_at).getTime() - new Date(left.last_seen_at).getTime();
  });

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
      setUsers((current) =>
        current.map((user) =>
          user.user_id === userId ? { ...user, ...payload.data.user } : user,
        ),
      );
      setMessage(isBlocked ? "User blocked." : "User unblocked.");
    } else {
      setMessage(payload.message ?? "Update failed.");
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
          Review Google accounts, block harmful behavior, and inspect recent
          activity across the site.
        </p>
        <p className="mt-4 text-sm text-text-secondary" aria-live="polite">
          {message}
        </p>
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
          {orderedUsers.map((user) => (
            <article
              key={user.user_id}
              className="grid gap-4 rounded-2xl border border-border bg-background/70 p-4 lg:grid-cols-[1fr_320px_auto]"
            >
              <div>
                <p className="font-semibold text-text-primary">
                  {user.display_name ?? user.email}
                </p>
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
                disabled={user.user_id === adminUserId}
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
                  disabled={user.user_id === adminUserId}
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  Block
                </Button>
              )}
            </article>
          ))}
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
    </div>
  );
}

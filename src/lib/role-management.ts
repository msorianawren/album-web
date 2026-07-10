import "server-only";
import type { NextRequest } from "next/server";
import { logAuditEvent } from "@/lib/audit";
import { supabase } from "@/lib/supabase";
import type { AuditLog, PublicSession, UserProfile, UserRole } from "@/lib/types";

export type AdminUserProfile = UserProfile & {
  role: UserRole;
};

function ownerId() {
  return process.env.DEFAULT_OWNER_ID ?? "";
}

export function normalizeUserRole(value: unknown): UserRole {
  return value === "founder" || value === "admin" || value === "user" ? value : "user";
}

export function effectiveUserRole(profile: Pick<UserProfile, "user_id" | "role">): UserRole {
  return profile.user_id === ownerId() ? "founder" : normalizeUserRole(profile.role);
}

export function normalizeAdminProfile(profile: UserProfile): AdminUserProfile {
  return {
    ...profile,
    role: effectiveUserRole(profile),
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function listAdminUsers(search = "", page = 1, limit = 30, filter = "all"): Promise<{ users: AdminUserProfile[], count: number }> {
  const term = search.trim();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("user_profiles")
    .select("*", { count: "exact" })
    .order("last_seen_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filter === "blocked") {
    query = query.eq("is_blocked", true);
  } else if (filter === "admins") {
    query = query.in("role", ["admin", "founder"]);
  }

  if (term) {
    if (isUuid(term)) {
      query = query.eq("user_id", term);
    } else {
      const escaped = term.replaceAll("%", "\\%").replaceAll("_", "\\_");
      query = query.or(`email.ilike.%${escaped}%,display_name.ilike.%${escaped}%`);
    }
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  
  return {
    users: ((data ?? []) as UserProfile[]).map(normalizeAdminProfile),
    count: count ?? 0
  };
}

export async function getAdminProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizeAdminProfile(data as UserProfile) : null;
}

export async function getRoleAuditLogs(limit = 80): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .in("action", [
      "grant_admin",
      "revoke_admin",
      "failed_grant_admin",
      "failed_revoke_admin",
      "unauthorized_role_change_attempt",
      "founder_protection_triggered",
    ])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLog[];
}

async function writeRoleAudit({
  request,
  session,
  action,
  targetId,
  previousRole,
  newRole,
  result,
  failureReason,
}: {
  request: NextRequest;
  session: PublicSession;
  action: string;
  targetId: string;
  previousRole?: UserRole | null;
  newRole?: UserRole | null;
  result: "success" | "failed";
  failureReason?: string;
}) {
  await logAuditEvent({
    request,
    session,
    action,
    targetType: "user",
    targetId,
    metadata: {
      target_user_id: targetId,
      previous_role: previousRole ?? null,
      new_role: newRole ?? null,
      result,
      failure_reason: failureReason ?? null,
    },
  });
}

export async function logUnauthorizedRoleAttempt({
  request,
  session,
  targetId,
  reason,
}: {
  request: NextRequest;
  session: PublicSession;
  targetId: string;
  reason: string;
}) {
  await writeRoleAudit({
    request,
    session,
    action: "unauthorized_role_change_attempt",
    targetId,
    previousRole: null,
    newRole: null,
    result: "failed",
    failureReason: reason,
  });
}

export async function grantAdminRole({
  request,
  session,
  targetId,
  reason,
}: {
  request: NextRequest;
  session: PublicSession;
  targetId: string;
  reason?: string;
}) {
  const target = await getAdminProfile(targetId);
  if (!target) {
    await writeRoleAudit({
      request,
      session,
      action: "failed_grant_admin",
      targetId,
      previousRole: null,
      newRole: "admin",
      result: "failed",
      failureReason: "User profile not found.",
    });
    return { ok: false as const, code: "NOT_FOUND", message: "User profile not found." };
  }

  if (target.role === "founder") {
    await writeRoleAudit({
      request,
      session,
      action: "founder_protection_triggered",
      targetId,
      previousRole: target.role,
      newRole: target.role,
      result: "failed",
      failureReason: "Founder role cannot be overwritten.",
    });
    return { ok: false as const, code: "FORBIDDEN", message: "Founder role cannot be overwritten." };
  }

  if (target.role === "admin") {
    return { ok: true as const, user: target };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      role: "admin",
      promoted_by: session.userId,
      promoted_at: now,
      revoked_by: null,
      revoked_at: null,
      last_role_changed_at: now,
      role_change_reason: reason ?? "Founder granted admin rights.",
    })
    .eq("user_id", targetId)
    .neq("role", "founder")
    .select("*")
    .single();

  if (error || !data) {
    await writeRoleAudit({
      request,
      session,
      action: "failed_grant_admin",
      targetId,
      previousRole: target.role,
      newRole: "admin",
      result: "failed",
      failureReason: error?.message ?? "Role update failed.",
    });
    return { ok: false as const, code: "SERVER_ERROR", message: error?.message ?? "Role update failed." };
  }

  await writeRoleAudit({
    request,
    session,
    action: "grant_admin",
    targetId,
    previousRole: target.role,
    newRole: "admin",
    result: "success",
  });

  return { ok: true as const, user: normalizeAdminProfile(data as UserProfile) };
}

export async function revokeAdminRole({
  request,
  session,
  targetId,
  reason,
}: {
  request: NextRequest;
  session: PublicSession;
  targetId: string;
  reason?: string;
}) {
  const target = await getAdminProfile(targetId);
  if (!target) {
    await writeRoleAudit({
      request,
      session,
      action: "failed_revoke_admin",
      targetId,
      previousRole: null,
      newRole: "user",
      result: "failed",
      failureReason: "User profile not found.",
    });
    return { ok: false as const, code: "NOT_FOUND", message: "User profile not found." };
  }

  if (target.role === "founder") {
    await writeRoleAudit({
      request,
      session,
      action: "founder_protection_triggered",
      targetId,
      previousRole: target.role,
      newRole: target.role,
      result: "failed",
      failureReason: "Founder role cannot be revoked.",
    });
    return { ok: false as const, code: "FORBIDDEN", message: "Founder role cannot be revoked." };
  }

  if (target.role !== "admin") {
    return { ok: true as const, user: target };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      role: "user",
      revoked_by: session.userId,
      revoked_at: now,
      last_role_changed_at: now,
      role_change_reason: reason ?? "Founder revoked admin rights.",
    })
    .eq("user_id", targetId)
    .eq("role", "admin")
    .select("*")
    .single();

  if (error || !data) {
    await writeRoleAudit({
      request,
      session,
      action: "failed_revoke_admin",
      targetId,
      previousRole: target.role,
      newRole: "user",
      result: "failed",
      failureReason: error?.message ?? "Role update failed.",
    });
    return { ok: false as const, code: "SERVER_ERROR", message: error?.message ?? "Role update failed." };
  }

  await writeRoleAudit({
    request,
    session,
    action: "revoke_admin",
    targetId,
    previousRole: target.role,
    newRole: "user",
    result: "success",
  });

  return { ok: true as const, user: normalizeAdminProfile(data as UserProfile) };
}

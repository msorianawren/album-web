import type { NextRequest } from "next/server";
import { requireAdmin, requireFounder } from "@/lib/auth";
import type { PublicSession } from "@/lib/types";

export function isAdminUser(user: { id?: string | null } | null | undefined) {
  const adminId = process.env.DEFAULT_OWNER_ID;
  return Boolean(user?.id && adminId && user.id === adminId);
}

export async function requireAdminUser(request?: NextRequest): Promise<PublicSession> {
  const session = await requireAdmin(request);
  if (!session) {
    throw new Error("Admin access required.");
  }
  return session;
}

export async function requireFounderUser(request?: NextRequest): Promise<PublicSession> {
  const session = await requireFounder(request);
  if (!session) {
    throw new Error("Founder access required.");
  }
  return session;
}

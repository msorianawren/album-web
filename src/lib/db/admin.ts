import "server-only";
import type { NextRequest } from "next/server";
import { requireAdmin, requireFounder } from "@/lib/auth";
import { createTrustedServiceRoleClient } from "@/lib/db/trusted-service";
import type { PublicSession } from "@/lib/types";

export interface TrustedAdminDatabase {
  session: PublicSession;
  client: ReturnType<typeof createTrustedServiceRoleClient>;
}

export function isTrustedAdminSession(
  session: PublicSession | null | undefined,
  founderOnly = false,
): session is PublicSession {
  if (!session?.userId || session.isBlocked) return false;
  return founderOnly ? session.isFounder : session.isAdmin;
}

export async function getTrustedAdminDatabase(
  request?: NextRequest,
): Promise<TrustedAdminDatabase | null> {
  const session = await requireAdmin(request);
  if (!isTrustedAdminSession(session)) return null;
  return { session, client: createTrustedServiceRoleClient() };
}

export async function getTrustedFounderDatabase(
  request?: NextRequest,
): Promise<TrustedAdminDatabase | null> {
  const session = await requireFounder(request);
  if (!isTrustedAdminSession(session, true)) return null;
  return { session, client: createTrustedServiceRoleClient() };
}

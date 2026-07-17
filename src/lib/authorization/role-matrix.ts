export type AuthorizationPrincipal =
  | "anonymous"
  | "authenticated"
  | "blocked"
  | "admin"
  | "founder"
  | "worker";

export type PrivateAlbumEntitlement =
  | "none"
  | "pending"
  | "denied"
  | "revoked"
  | "feather_purchase"
  | "selected_album"
  | "all_private";

export type PrivateAlbumAccessReason =
  | "anonymous"
  | "blocked"
  | "pending"
  | "denied"
  | "revoked"
  | "missing_grant"
  | "selected_album_grant"
  | "all_private_grant"
  | "feather_purchase"
  | "trusted_admin"
  | "trusted_worker";

export interface PrivateAlbumAccessDecision {
  allowed: boolean;
  reason: PrivateAlbumAccessReason;
}

export function decidePrivateAlbumAccess(
  principal: AuthorizationPrincipal,
  entitlement: PrivateAlbumEntitlement,
): PrivateAlbumAccessDecision {
  if (principal === "blocked") return { allowed: false, reason: "blocked" };
  if (principal === "anonymous") return { allowed: false, reason: "anonymous" };
  if (principal === "founder" || principal === "admin") {
    return { allowed: true, reason: "trusted_admin" };
  }
  if (principal === "worker") return { allowed: true, reason: "trusted_worker" };

  if (entitlement === "feather_purchase") {
    return { allowed: true, reason: "feather_purchase" };
  }
  if (entitlement === "revoked") return { allowed: false, reason: "revoked" };
  if (entitlement === "denied") return { allowed: false, reason: "denied" };
  if (entitlement === "pending") return { allowed: false, reason: "pending" };
  if (entitlement === "selected_album") {
    return { allowed: true, reason: "selected_album_grant" };
  }
  if (entitlement === "all_private") {
    return { allowed: true, reason: "all_private_grant" };
  }
  return { allowed: false, reason: "missing_grant" };
}

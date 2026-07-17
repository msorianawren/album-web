import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPublicSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security-rate-limit";

const routeParamsSchema = z.object({ id: z.string().uuid() });

function purchaseFailure(message: string) {
  if (message.includes("INSUFFICIENT_FEATHERS")) return apiError("FORBIDDEN", "You do not have enough Wren Feathers for this album.", 403);
  if (message.includes("PURCHASE_NOT_AVAILABLE")) return apiError("FORBIDDEN", "Feather unlocking is not available for this album.", 403);
  if (message.includes("ALBUM_NOT_FOUND")) return apiError("NOT_FOUND", "Album not found.", 404);
  if (message.includes("ACCOUNT_BLOCKED")) return apiError("FORBIDDEN", "This account cannot unlock albums.", 403);
  if (message.includes("PROFILE_REQUIRED")) return apiError("FORBIDDEN", "Your account is not ready to unlock albums yet. Please refresh and try again.", 403);
  if (message.includes("ALREADY_AUTHORIZED")) return apiError("CONFLICT", "This account already has album access.", 409);
  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedParams = routeParamsSchema.safeParse(await params);
    if (!parsedParams.success) return apiError("INVALID_INPUT", "Invalid album.", 400);

    const session = await getPublicSession(request);
    if (!session.userId || session.isBlocked) {
      return apiError("UNAUTHENTICATED", "Login with an eligible account is required.", 401);
    }

    const rate = await enforceRateLimit({
      request,
      session,
      policy: { action: "purchase_private_album_with_feathers", limit: 10, windowSeconds: 300 },
    });
    if (!rate.allowed) return apiError("RATE_LIMITED", "Too many unlock attempts. Please wait before trying again.", 429);

    const userClient = await createAuthenticatedUserClient(request);
    if (!userClient) return apiError("UNAUTHENTICATED", "Login is required.", 401);
    const { data, error } = await userClient.rpc("purchase_private_album_with_feathers", {
      target_album_id: parsedParams.data.id,
    });
    if (error) {
      const response = purchaseFailure(error.message);
      if (response) return response;
      throw error;
    }

    const purchase = Array.isArray(data) ? data[0] : data;
    if (!purchase || typeof purchase.remaining_feathers !== "number" || typeof purchase.price_paid !== "number") {
      throw new Error("Invalid Feather purchase response.");
    }

    await logAuditEvent({
      request,
      session,
      action: "feather_purchase_completed",
      targetType: "album",
      targetId: parsedParams.data.id,
      metadata: {
        pricePaid: purchase.price_paid,
        remainingFeathers: purchase.remaining_feathers,
        alreadyOwned: Boolean(purchase.already_owned),
      },
    });
    revalidatePath(`/albums/${parsedParams.data.id}`);
    return apiSuccess({
      pricePaid: purchase.price_paid,
      remainingFeathers: purchase.remaining_feathers,
      alreadyOwned: Boolean(purchase.already_owned),
    });
  } catch (error) {
    return toServerError(error, request, "api.albums.feather_purchase");
  }
}

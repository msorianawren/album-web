import { NextRequest, NextResponse } from "next/server";
import { classifyDataFailure } from "@/lib/app-failure";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, toServerError } from "@/lib/errors";
import { z } from "zod";

const ReorderSchema = z.object({
  status: z.enum(["public", "updating", "private"]),
  albumIds: z.array(z.string().uuid()),
});

export async function POST(request: NextRequest) {
  try {
    const database = await getTrustedAdminDatabase(request);
    if (!database) {
      return apiError("FORBIDDEN", "Only the admin can reorder albums.", 403);
    }
    const { session, client } = database;

    const body = await request.json();
    const parsed = ReorderSchema.safeParse(body);
    
    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid reorder payload", 400);
    }

    const { status, albumIds } = parsed.data;

    // Use the RPC to atomically update order
    const { error } = await client.rpc("reorder_albums", {
      p_status: status,
      p_album_ids: albumIds,
      p_user_id: session.userId,
    });

    if (error) {
      throw classifyDataFailure(error, "albums.admin_reorder");
    }

    return NextResponse.json({ success: true, message: "Order updated successfully" });
  } catch (error) {
    return toServerError(error);
  }
}

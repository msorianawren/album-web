import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import { apiError, toServerError } from "@/lib/errors";
import { z } from "zod";

const ReorderSchema = z.object({
  status: z.enum(["public", "updating", "private"]),
  albumIds: z.array(z.string().uuid()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminUser(request);

    const body = await request.json();
    const parsed = ReorderSchema.safeParse(body);
    
    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid reorder payload", 400);
    }

    const { status, albumIds } = parsed.data;

    // Use the RPC to atomically update order
    const { error } = await supabase.rpc("reorder_albums", {
      p_status: status,
      p_album_ids: albumIds,
      p_user_id: session.userId,
    });

    if (error) {
      console.error("Reorder RPC error:", error);
      return apiError("SERVER_ERROR", "Failed to update order", 500);
    }

    return NextResponse.json({ success: true, message: "Order updated successfully" });
  } catch (error) {
    return toServerError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { classifyDataFailure } from "@/lib/app-failure";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { toServerError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

type NotificationUpdate = {
  status: "read" | "dismissed";
  read_at?: string;
  dismissed_at?: string;
};

const notificationIdSchema = z.string().uuid();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPublicSession(request);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }
    const client = await createAuthenticatedUserClient(request);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }

    const idResult = notificationIdSchema.safeParse((await params).id);
    if (!idResult.success) {
      return NextResponse.json({ success: false, message: "Invalid notification id" }, { status: 400, headers: noStoreHeaders });
    }
    const id = idResult.data;
    const body = await request.json().catch(() => null);
    
    if (!body || !["read", "dismissed"].includes(body.status)) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400, headers: noStoreHeaders });
    }

    const updateData: NotificationUpdate = { status: body.status };
    if (body.status === "read") updateData.read_at = new Date().toISOString();
    if (body.status === "dismissed") updateData.dismissed_at = new Date().toISOString();

    const { data, error } = await client
      .from("notifications")
      .update(updateData)
      .eq("id", id)
      .eq("recipient_user_id", session.userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ success: false, message: "Notification not found" }, { status: 404, headers: noStoreHeaders });
    }

    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error: unknown) {
    return toServerError(
      classifyDataFailure(error, "notifications.user_update"),
      request,
      "api.notifications.update",
    );
  }
}

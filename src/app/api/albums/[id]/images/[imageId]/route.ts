import { NextRequest } from "next/server";
import { DELETE as deleteMedia, PATCH as patchMedia } from "@/app/api/media/[id]/route";

interface LegacyMediaRouteProps {
  params: Promise<{ id: string; imageId: string }>;
}

export async function PATCH(request: NextRequest, { params }: LegacyMediaRouteProps) {
  const { imageId } = await params;
  return patchMedia(request, { params: Promise.resolve({ id: imageId }) });
}

export async function DELETE(request: NextRequest, { params }: LegacyMediaRouteProps) {
  const { imageId } = await params;
  return deleteMedia(request, { params: Promise.resolve({ id: imageId }) });
}

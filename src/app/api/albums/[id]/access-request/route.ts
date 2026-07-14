import { NextRequest } from "next/server";
import { handleAlbumAccessRequestSubmit } from "@/lib/access-request-submit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleAlbumAccessRequestSubmit(request, id);
}

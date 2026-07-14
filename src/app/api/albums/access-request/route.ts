import { NextRequest } from "next/server";
import { handleAlbumAccessRequestSubmit } from "@/lib/access-request-submit";

export async function POST(request: NextRequest) {
  return handleAlbumAccessRequestSubmit(request);
}

import { NextRequest } from "next/server";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getAlbumPage } from "@/lib/albums";
import { albumPageQuerySchema } from "@/lib/validators";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";

export async function GET(request: NextRequest) {
  try {
    const parsed = albumPageQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid search query.", 400);
    }

    if (!parsed.data.status) {
      return apiError("INVALID_INPUT", "A single album status is required for cursor pagination.", 400);
    }

    const session = await getPublicSession(request);
    const userClient = session.userId ? await createAuthenticatedUserClient(request) : null;
    const page = await getAlbumPage({ ...parsed.data, status: parsed.data.status, session, userClient });
    return apiSuccess({ page }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return toServerError(error, request, "api.search.albums");
  }
}

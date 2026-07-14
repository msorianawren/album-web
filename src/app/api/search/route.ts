import { NextRequest } from "next/server";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getAlbums } from "@/lib/albums";
import { searchParamsSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const parsed = searchParamsSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid search query.", 400);
    }

    const albums = await getAlbums(parsed.data);
    return apiSuccess({ albums });
  } catch (error) {
    return toServerError(error, request, "api.search.albums");
  }
}

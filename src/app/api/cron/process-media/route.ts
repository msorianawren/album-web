import { NextRequest } from "next/server";
import { getTrustedWorkerDatabase } from "@/lib/db/worker";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { processQueuedImageJobs } from "@/lib/media/processing-jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const database = getTrustedWorkerDatabase(request, "media-processing");
  if (!database) return apiError("UNAUTHENTICATED", "Invalid worker credentials.", 401);
  try {
    const requested = Number(request.nextUrl.searchParams.get("batch") ?? 2);
    const summary = await processQueuedImageJobs(
      database.client,
      Number.isInteger(requested) ? requested : 2,
    );
    return apiSuccess(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toServerError(error, request, "api.cron.process_media");
  }
}

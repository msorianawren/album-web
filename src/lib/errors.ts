import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "UPLOAD_FAILED"
  | "SERVER_ERROR";

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export function toServerError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return apiError("SERVER_ERROR", message, 500);
}

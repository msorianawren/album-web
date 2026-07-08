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
  | "COMMENT_BLOCKED"
  | "UPLOAD_FAILED"
  | "SERVER_ERROR";

const publicErrorMessages: Partial<Record<ApiErrorCode, string>> = {
  SERVER_ERROR: "The server could not complete this request.",
  UPLOAD_FAILED: "The upload or storage operation could not be completed.",
};

function publicMessage(code: ApiErrorCode, message: string) {
  if (process.env.NODE_ENV !== "production") return message;
  return publicErrorMessages[code] ?? message;
}

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
      message: publicMessage(code, message),
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export function toServerError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return apiError("SERVER_ERROR", message, 500);
}

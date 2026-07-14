import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AppFailure,
  createRequestId,
  reportAppFailure,
  toAppFailure,
  type AppFailureCode,
} from "@/lib/app-failure";

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
  | "SERVER_ERROR"
  | AppFailureCode;

const publicErrorMessages: Partial<Record<ApiErrorCode, string>> = {
  SERVER_ERROR: "The server could not complete this request.",
  UPLOAD_FAILED: "The upload or storage operation could not be completed.",
};

const noStoreHeaders = {
  "Cache-Control": "no-store",
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
  requestId?: string,
) {
  let responseRequestId = requestId;
  if (status >= 500 && !responseRequestId) {
    const failure = reportAppFailure(
      new AppFailure({
        code: "UNEXPECTED_FAILURE",
        operation: "api.error_response",
        publicMessage: publicMessage(code, message),
        status,
        retryable: false,
      }),
    );
    responseRequestId = failure.requestId;
  }

  return NextResponse.json(
    {
      success: false,
      code,
      message: publicMessage(code, message),
      ...(details ? { details } : {}),
      ...(responseRequestId ? { requestId: responseRequestId } : {}),
    },
    { status, headers: noStoreHeaders },
  );
}

export function toServerError(
  error: unknown,
  request?: NextRequest,
  operation = "api.request",
) {
  const incomingRequestId = request?.headers.get("x-request-id");
  const failure = reportAppFailure(
    error instanceof AppFailure
      ? error
      : toAppFailure(error, operation, createRequestId(incomingRequestId)),
  );
  return apiError(
    failure.code,
    failure.publicMessage,
    failure.status,
    undefined,
    failure.requestId,
  );
}

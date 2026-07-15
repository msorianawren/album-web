import { randomUUID } from "node:crypto";

export type AppFailureCode =
  | "AUTHENTICATION_FAILED"
  | "AUTHORIZATION_FAILED"
  | "DATABASE_UNAVAILABLE"
  | "DATABASE_SCHEMA_MISMATCH"
  | "STORAGE_UNAVAILABLE"
  | "PROCESSING_FAILED"
  | "UNEXPECTED_FAILURE";

type AppFailureOptions = {
  code: AppFailureCode;
  operation: string;
  publicMessage: string;
  status: number;
  retryable: boolean;
  requestId?: string;
  providerCode?: string | null;
  cause?: unknown;
};

const requestIdPattern = /^[A-Za-z0-9._:-]{8,80}$/;
const schemaErrorCodes = new Set(["42P01", "42703", "PGRST204"]);
const authenticationErrorCodes = new Set(["PGRST301", "401"]);
const authorizationErrorCodes = new Set(["42501", "403"]);

function providerCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code.length <= 40 ? code : null;
}

export function createRequestId(candidate?: string | null) {
  const value = candidate?.trim();
  return value && requestIdPattern.test(value) ? value : randomUUID();
}

export class AppFailure extends Error {
  readonly code: AppFailureCode;
  readonly operation: string;
  readonly publicMessage: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly requestId: string;
  readonly providerCode: string | null;
  reported = false;

  constructor(options: AppFailureOptions) {
    super(options.publicMessage, { cause: options.cause });
    this.name = "AppFailure";
    this.code = options.code;
    this.operation = options.operation;
    this.publicMessage = options.publicMessage;
    this.status = options.status;
    this.retryable = options.retryable;
    this.requestId = createRequestId(options.requestId);
    this.providerCode = options.providerCode ?? providerCode(options.cause);
  }
}

export function classifyDataFailure(
  error: unknown,
  operation: string,
  requestId?: string | null,
) {
  if (error instanceof AppFailure) return error;

  const code = providerCode(error);
  if (code && schemaErrorCodes.has(code)) {
    return new AppFailure({
      code: "DATABASE_SCHEMA_MISMATCH",
      operation,
      publicMessage: "This part of the gallery is temporarily unavailable while its data is updated.",
      status: 503,
      retryable: false,
      requestId: requestId ?? undefined,
      providerCode: code,
      cause: error,
    });
  }

  if (code && authenticationErrorCodes.has(code)) {
    return new AppFailure({
      code: "AUTHENTICATION_FAILED",
      operation,
      publicMessage: "Please sign in again before continuing.",
      status: 401,
      retryable: false,
      requestId: requestId ?? undefined,
      providerCode: code,
      cause: error,
    });
  }

  if (code && authorizationErrorCodes.has(code)) {
    return new AppFailure({
      code: "AUTHORIZATION_FAILED",
      operation,
      publicMessage: "You do not have permission to access this content.",
      status: 403,
      retryable: false,
      requestId: requestId ?? undefined,
      providerCode: code,
      cause: error,
    });
  }

  return new AppFailure({
    code: "DATABASE_UNAVAILABLE",
    operation,
    publicMessage: "The gallery service is temporarily unavailable. Please try again.",
    status: 503,
    retryable: true,
    requestId: requestId ?? undefined,
    providerCode: code,
    cause: error,
  });
}

export function createStorageFailure(
  error: unknown,
  operation: string,
  requestId?: string | null,
) {
  if (error instanceof AppFailure) return error;
  return new AppFailure({
    code: "STORAGE_UNAVAILABLE",
    operation,
    publicMessage: "The media storage service is temporarily unavailable. Please try again.",
    status: 503,
    retryable: true,
    requestId: requestId ?? undefined,
    providerCode: providerCode(error),
    cause: error,
  });
}

export function createProcessingFailure(
  error: unknown,
  operation: string,
  requestId?: string | null,
) {
  if (error instanceof AppFailure) return error;
  return new AppFailure({
    code: "PROCESSING_FAILED",
    operation,
    publicMessage: "This media file could not be processed safely.",
    status: 422,
    retryable: false,
    requestId: requestId ?? undefined,
    providerCode: providerCode(error),
    cause: error,
  });
}

export function reportAppFailure(failure: AppFailure) {
  if (failure.reported) return failure;
  failure.reported = true;
  console.error(
    JSON.stringify({
      level: "error",
      event: "application_failure",
      requestId: failure.requestId,
      code: failure.code,
      operation: failure.operation,
      retryable: failure.retryable,
      providerCode: failure.providerCode,
    }),
  );
  return failure;
}

export function resolveQueryRows<T>(
  data: T[] | null | undefined,
  error: unknown,
  operation: string,
) {
  if (error) throw classifyDataFailure(error, operation);
  return data ?? [];
}

export function resolveOptionalRow<T>(
  data: T | null | undefined,
  error: unknown,
  operation: string,
) {
  if (error) throw classifyDataFailure(error, operation);
  return data ?? null;
}

export function toAppFailure(
  error: unknown,
  operation = "request",
  requestId?: string | null,
) {
  if (error instanceof AppFailure) return error;
  return new AppFailure({
    code: "UNEXPECTED_FAILURE",
    operation,
    publicMessage: "The server could not complete this request.",
    status: 500,
    retryable: false,
    requestId: requestId ?? undefined,
    cause: error,
  });
}

/** Every failure the SDK throws is a NeogateError, so one catch is enough. */
export class NeogateError extends Error {
  override name = 'NeogateError';
}

/** The panel answered, with an error status. */
export class ApiError extends NeogateError {
  override name = 'ApiError';
  constructor(
    /** HTTP status */
    readonly status: number,
    /** the panel's own message when it sent one */
    message: string,
    readonly method: string,
    readonly path: string,
    /** the parsed body, when it was JSON */
    readonly body?: unknown
  ) {
    super(message);
  }
}

/** 401: no token, a wrong one, a deleted or expired one. */
export class AuthenticationError extends ApiError {
  override name = 'AuthenticationError';
}

/** 403 and 402: the token is fine but may not do this (read-only token, an unpaid plan, an unverified email). */
export class PermissionError extends ApiError {
  override name = 'PermissionError';
}

export class NotFoundError extends ApiError {
  override name = 'NotFoundError';
}

/** 422 and 400: the request itself is wrong. */
export class ValidationError extends ApiError {
  override name = 'ValidationError';
}

export class RateLimitError extends ApiError {
  override name = 'RateLimitError';
  constructor(
    message: string,
    method: string,
    path: string,
    body: unknown,
    /** seconds the panel asked to wait, when it said */
    readonly retryAfter?: number
  ) {
    super(429, message, method, path, body);
  }
}

/** The request never got an answer: DNS, connection, or the timeout. */
export class NetworkError extends NeogateError {
  override name = 'NetworkError';
  constructor(
    message: string,
    readonly timedOut = false,
    override readonly cause?: unknown
  ) {
    super(message);
  }
}

export function apiError(status: number, message: string, method: string, path: string, body: unknown, retryAfter?: number): ApiError {
  if (status === 401) return new AuthenticationError(status, message, method, path, body);
  if (status === 402 || status === 403) return new PermissionError(status, message, method, path, body);
  if (status === 404) return new NotFoundError(status, message, method, path, body);
  if (status === 400 || status === 422) return new ValidationError(status, message, method, path, body);
  if (status === 429) return new RateLimitError(message, method, path, body, retryAfter);
  return new ApiError(status, message, method, path, body);
}

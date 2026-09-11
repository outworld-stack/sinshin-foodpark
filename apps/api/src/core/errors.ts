/**
 * Domain error hierarchy → mapped to HTTP responses by one Elysia onError.
 * Services throw these; controllers never shape error payloads by hand.
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message } };
  }
}

export class ValidationError extends AppError {
  readonly status = 422;
  readonly code = "VALIDATION_ERROR";
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = "UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "NOT_FOUND";
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = "CONFLICT";
}

export class TooManyRequestsError extends AppError {
  readonly status = 429;
  readonly code = "TOO_MANY_REQUESTS";
}

export class ExternalServiceError extends AppError {
  readonly status = 502;
  readonly code = "EXTERNAL_SERVICE_ERROR";
}
export type AppErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "CONFLICT"
  | "VALIDATION"
  | "NOT_YOUR_TURN"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }

  toUserMessage(): string {
    return this.message;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We couldn't find what you were looking for.") {
    super("NOT_FOUND", message, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super("FORBIDDEN", message, 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message = "That action couldn't be completed — please try again.") {
    super("CONFLICT", message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Please check the highlighted fields and try again.") {
    super("VALIDATION", message, 422);
  }
}

export class NotYourTurnError extends AppError {
  constructor(message = "It's not your turn to pick yet.") {
    super("NOT_YOUR_TURN", message, 409);
  }
}

/** Maps any thrown value to a safe, user-facing message. Never leaks internals. */
export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.toUserMessage();
  return "Something went wrong on our end. Please try again in a moment.";
}

export function toStatus(error: unknown): number {
  if (error instanceof AppError) return error.status;
  return 500;
}

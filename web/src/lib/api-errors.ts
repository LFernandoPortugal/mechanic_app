export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function isSessionExpiredError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 401;
}

export function isConflictError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 409;
}

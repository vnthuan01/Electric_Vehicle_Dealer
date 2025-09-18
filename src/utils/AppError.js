export class AppError extends Error {
  constructor(message, statusCode = 400, errorCode = 1000) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

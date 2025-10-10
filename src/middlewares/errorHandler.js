import {logError} from "../utils/logger.js";
import {error as errorRes} from "../utils/response.js";

// Middleware cho route không tồn tại
export function notFoundHandler(req, res) {
  return errorRes(res, "Endpoint not found", 404);
}

// Middleware cho lỗi toàn cục
export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const code = err.errorCode || 1000;
  const message = err.message || "Internal server error";

  if (process.env.NODE_ENV !== "test") {
    logError(err);
    next();
  }

  return errorRes(res, message, status, code);
}

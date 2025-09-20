import {logError} from "../utils/logger.js";
import {error as errorRes} from "../utils/response.js";

export function notFoundHandler(res) {
  return errorRes(res, "Endpoint không tồn tại", 404);
}

export function errorHandler(err, res) {
  const status = err.statusCode || 500;
  const code = err.errorCode || 1000;
  const message = err.message || "Lỗi hệ thống";
  if (process.env.NODE_ENV !== "test") {
    logError(err);
  }
  return errorRes(res, message, status, code);
}

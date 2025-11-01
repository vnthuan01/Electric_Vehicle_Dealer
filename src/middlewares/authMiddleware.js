import {verifyToken} from "../utils/jwt.js";
import {error as errorRes} from "../utils/response.js";

// Xác thực JWT và gắn payload vào req.user
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return errorRes(res, "Missing auth token", 401, "no_token");
  try {
    const payload = verifyToken(token);
    req.user = payload;
    return next();
  } catch (e) {
    return errorRes(res, "Invalid token", 401, "invalid_token" || e.message);
  }
}

// export function authorize(...roles) {
//   return (req, res, next) => {
//     if (!req.user) return errorRes(res, "Unauthorized", 401);
//     if (roles.length && !roles.includes(req.user.role)) {
//       return errorRes(res, "Forbidden", 403);
//     }
//     return next();
//   };
// }

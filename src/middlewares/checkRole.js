// Middleware kiểm tra quyền theo tên role (Dealer Staff, Dealer Manager, EVM Staff, Admin)
// Giả định req.user.roleName đã có (gắn khi verify JWT) hoặc có role_id để populate nếu cần ở tầng controller

import { error as errorRes } from "../utils/response.js";

export function checkRole(rolesArray = []) {
  return (req, res, next) => {
    const roleName = req.user?.roleName || req.user?.role;
    if (!roleName) return errorRes(res, "Unauthorized: missing role", 401);
    if (rolesArray.length && !rolesArray.includes(roleName)) {
      return errorRes(res, "Forbidden", 403);
    }
    return next();
  };
}

export const AuthMessage = {
  // Register
  REGISTER_SUCCESS: "User registered successfully",
  EMAIL_ALREADY_EXISTS: "Email already exists",
  INVALID_ROLE: "Invalid role",
  UNAUTHORIZED: "Unauthorized",
  ADMIN_CANNOT_CREATE_ADMIN: "Admin cannot create another Admin",
  DEALER_MANAGER_ONLY_CREATE_STAFF:
    "Dealer Manager can only create Dealer Staff accounts",
  REGISTER_FAILED: "User registration failed",

  // Login
  LOGIN_SUCCESS: "Login successful",
  INVALID_CREDENTIALS: "Invalid credentials",

  // Refresh token
  REFRESH_SUCCESS: "Token refreshed successfully",
  REFRESH_REQUIRED: "Refresh token required",
  REFRESH_INVALID: "Invalid refresh token",
  USER_NOT_FOUND: "User not found",

  // Logout
  LOGOUT_SUCCESS: "Logged out successfully",
};

export const VehicleMessage = {
  LIST_SUCCESS: "Vehicle list retrieved successfully",
  DETAIL_SUCCESS: "Vehicle detail retrieved successfully",
  CREATE_SUCCESS: "Vehicle(s) created successfully",
  UPDATE_SUCCESS: "Vehicle updated successfully",
  DELETE_SUCCESS: "Vehicle deleted successfully",

  NOT_FOUND: "Vehicle not found",
  INVALID_REQUEST: "Invalid request or no valid vehicles to create",
  MISSING_REQUIRED_FIELDS:
    "Missing required fields: sku, name, category, price, manufacturer_id",
  SKU_ALREADY_EXISTS: "Vehicle with this SKU already exists",
};

export const TestDriveMessage = {
  CREATE_SUCCESS: "Tạo lịch lái thử thành công",
  INVALID_REQUEST: "Dữ liệu lịch lái thử không hợp lệ",
  MISSING_REQUIRED_FIELDS: "Thiếu trường bắt buộc",
  CUSTOMER_NOT_FOUND: "Khách hàng không tồn tại",
  VEHICLE_NOT_FOUND: "Xe không tồn tại",
};

export const FeedbackMessage = {
  CREATE_SUCCESS: "Tạo phản hồi thành công",
  INVALID_REQUEST: "Dữ liệu phản hồi không hợp lệ",
  MISSING_REQUIRED_FIELDS: "Thiếu trường bắt buộc",
  HANDLER_INVALID: "Handler không hợp lệ",
  NOT_FOUND: "Phản hồi/Khiếu nại không tồn tại",
  FORBIDDEN: "Bạn không có quyền cập nhật Feedback",
};

export const DealerMessage = {
  MISSING_FIELDS: "Required fields are missing",
  VEHICLE_NOT_FOUND: "Vehicle not found",
  INSUFFICIENT_STOCK: "Insufficient stock",
  REQUEST_APPROVED: "Vehicle request from Manufacturer approved successfully",
  DEBTS_RETRIEVED: "Dealer debts retrieved successfully",
};

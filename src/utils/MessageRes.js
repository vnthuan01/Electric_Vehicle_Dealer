export const AuthMessage = {
  // Register
  REGISTER_SUCCESS: "User registered successfully",
  EMAIL_ALREADY_EXISTS: "Email already exists",
  INVALID_ROLE: "Invalid role",

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

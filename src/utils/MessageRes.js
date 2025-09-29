export const AuthMessage = {
  //User
  USER_NOT_FOUND: "User not found",
  UPDATE_SUCCESS: "User updated successfully",
  DELETE_SUCCESS: "User deleted successfully",
  FETCH_SUCCESS: "Fetched users successfully",
  FETCH_ONE_SUCCESS: "Fetched user successfully",

  // Register
  REGISTER_SUCCESS: "User registered successfully",
  EMAIL_ALREADY_EXISTS: "Email already exists",
  INVALID_ROLE: "Invalid role",
  UNAUTHORIZED: "Unauthorized",
  ADMIN_CANNOT_CREATE_ADMIN: "Admin cannot create another Admin",
  DEALER_MANAGER_ONLY_CREATE_STAFF:
    "Dealer Manager can only create Dealer Staff accounts",
  REGISTER_FAILED: "User registration failed",
  MUST_PROVIDE_DEALERSHIP_OR_MANUFACTURER_ID:
    "Must provide either dealership_id or manufacturer_id",
  // Login
  LOGIN_SUCCESS: "Login successful",
  INVALID_CREDENTIALS: "Invalid credentials",

  // Refresh token
  REFRESH_SUCCESS: "Token refreshed successfully",
  REFRESH_REQUIRED: "Refresh token required",
  REFRESH_INVALID: "Invalid refresh token",

  // Logout
  LOGOUT_SUCCESS: "Logged out successfully",
};

export const UserMessage = {
  FETCH_SUCCESS: "Fetched users successfully",
  FETCH_ONE_SUCCESS: "Fetched user successfully",
  USER_NOT_FOUND: "User not found",
  EMAIL_ALREADY_EXISTS: "Email already exists",
  INVALID_ROLE: "Invalid role",
  CREATE_SUCCESS: "User created successfully",
  UPDATE_SUCCESS: "User updated successfully",
  DELETE_SUCCESS: "User deleted successfully",
};

export const CustomerMessage = {
  CREATE_SUCCESS: "Customer created successfully",
  UPDATE_SUCCESS: "Customer updated successfully",
  DELETE_SUCCESS: "Customer deleted successfully",
  LIST_RETRIEVED: "Customer list retrieved successfully",
  DETAIL_RETRIEVED: "Customer details retrieved successfully",
  NOT_FOUND: "Customer not found",
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

export const OrderMessage = {
  CREATE_SUCCESS: "Order created successfully",
  UPDATE_SUCCESS: "Order updated successfully",
  DELETE_SUCCESS: "Order deleted successfully",
  STATUS_UPDATE_SUCCESS: "Order status updated successfully",
  NOT_FOUND: "Order not found",
  INVALID_STATUS: "Invalid order status",
  LIST_SUCCESS: "Orders fetched successfully",
  DETAIL_SUCCESS: "Order details fetched successfully",
  MISSING_REQUIRED_FIELDS: "Missing required fields",
};

export const TestDriveMessage = {
  CREATE_SUCCESS: "Test drive created successfully",
  LIST_SUCCESS: "Test drive fetched all successfully",
  INVALID_REQUEST: "Invalid test drive data",
  MISSING_REQUIRED_FIELDS: "Missing required fields",
  CUSTOMER_NOT_FOUND: "Customer not found",
  VEHICLE_NOT_FOUND: "Vehicle not found",
};

export const FeedbackMessage = {
  CREATE_SUCCESS: "Feedback created successfully",
  INVALID_REQUEST: "Invalid feedback data",
  RETRIEVED_SUCCESS: "Feedbacks fetched successfully",
  MISSING_REQUIRED_FIELDS: "Missing required fields",
  HANDLER_INVALID: "Invalid handler",
  NOT_FOUND: "Feedback/Complaint not found",
  FORBIDDEN: "You are not allowed to update this feedback",
};

export const ManufacturerMessage = {
  CREATE_SUCCESS: "Manufacturer created successfully",
  LIST_SUCCESS: "Fetched manufacturers successfully",
  DETAIL_SUCCESS: "Fetched manufacturer successfully",
  UPDATE_SUCCESS: "Manufacturer updated successfully",
  DELETE_SUCCESS: "Manufacturer deleted successfully",

  NOT_FOUND: "Manufacturer not found",
  INVALID_REQUEST: "Invalid manufacturer data",

  //Debts
  DEBTS_RETRIEVED: "Manufacturer debts retrieved successfully",
};

export const DealerMessage = {
  // General
  CREATE_SUCCESS: "Dealership created successfully",
  UPDATE_SUCCESS: "Dealership updated successfully",
  DELETE_SUCCESS: "Dealership deleted successfully",
  LIST_RETRIEVED: "Dealership list retrieved successfully",
  DETAIL_RETRIEVED: "Dealership details retrieved successfully",
  DEACTIVATE_SUCCESS: "Dealership deactivated successfully",
  ALREADY_INACTIVE: "Dealership is already inactive",
  MANUFACTURER_REQUIRED: "Manufacturer not found",
  NOT_FOUND: "Dealership not found",
  DEBTS_RETRIEVED: "Dealer debts retrieved successfully",
  MISSING_FIELDS: "Missing required fields.",
  VEHICLE_NOT_FOUND: "Vehicle not found.",
  REQUEST_NOT_FOUND: "Request not found.",

  //Debts
  DEBTS_RETRIEVED: "Dealer debts retrieved successfully",

  // Request creation
  REQUEST_CREATED_PENDING:
    "Vehicle request has been created and is pending approval.",

  // Approval
  REQUEST_APPROVED: "Vehicle request has been approved successfully.",
  REQUEST_REJECTED: "Vehicle request has been rejected.",
  INSUFFICIENT_STOCK:
    "Manufacturer does not have enough stock to fulfill this request.",

  // Validation
  REQUEST_ALREADY_PROCESSED: "This request has already been processed.",
  REQUEST_CANNOT_DELETE:
    "Cannot delete a request that has already been processed.",

  // Listing
  REQUEST_LIST_SUCCESS: "List of vehicle requests retrieved successfully.",
};

export const PromotionMessage = {
  CREATE_SUCCESS: "Promotion created successfully",
  LIST_SUCCESS: "Fetched promotions successfully",
  DETAIL_SUCCESS: "Fetched promotion successfully",
  UPDATE_SUCCESS: "Promotion updated successfully",
  DELETE_SUCCESS: "Promotion deleted successfully",

  NOT_FOUND: "Promotion not found",
  INVALID_REQUEST: "Invalid promotion data",
};

export const AccessoryMessage = {
  CREATE_SUCCESS: "Accessory created successfully",
  LIST_SUCCESS: "Fetched accessories successfully",
  DETAIL_SUCCESS: "Fetched accessory successfully",
  UPDATE_SUCCESS: "Accessory updated successfully",
  DELETE_SUCCESS: "Accessory deleted successfully",

  NOT_FOUND: "Accessory not found",
};

export const OptionMessage = {
  CREATE_SUCCESS: "Option created successfully",
  LIST_SUCCESS: "Fetched options successfully",
  DETAIL_SUCCESS: "Fetched option successfully",
  UPDATE_SUCCESS: "Option updated successfully",
  DELETE_SUCCESS: "Option deleted successfully",

  NOT_FOUND: "Option not found",
};

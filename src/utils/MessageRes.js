export const AuthMessage = {
  //User
  USER_NOT_FOUND: "Không tìm thấy người dùng",
  UPDATE_SUCCESS: "Cập nhật người dùng thành công",
  DELETE_SUCCESS: "Xóa người dùng thành công",
  FETCH_SUCCESS: "Lấy danh sách người dùng thành công",
  FETCH_ONE_SUCCESS: "Lấy thông tin người dùng thành công",

  // Register
  REGISTER_SUCCESS: "Đăng ký thành công",
  EMAIL_ALREADY_EXISTS: "Email đã tồn tại",
  INVALID_ROLE: "Vai trò không hợp lệ",
  UNAUTHORIZED: "Không có quyền thực hiện hành động này",
  ADMIN_CANNOT_CREATE_ADMIN: "Admin không thể tạo tài khoản Admin khác",
  DEALER_MANAGER_ONLY_CREATE_STAFF:
    "Quản lý đại lý chỉ có thể tạo tài khoản nhân viên cho đại lý của họ",
  REGISTER_FAILED: "Đăng ký thất bại",
  MUST_PROVIDE_DEALERSHIP_OR_MANUFACTURER_ID:
    "Phải cung cấp dealership_id hoặc manufacturer_id",
  // Login
  LOGIN_SUCCESS: "Đăng nhập thành công",
  INVALID_CREDENTIALS: "Thông tin đăng nhập không hợp lệ",

  // Refresh token
  REFRESH_SUCCESS: "Làm mới token thành công",
  REFRESH_REQUIRED: "Cần làm mới token",
  REFRESH_INVALID: "Token làm mới không hợp lệ",

  // Logout
  LOGOUT_SUCCESS: "Đăng xuất thành công",
};

export const UserMessage = {
  FETCH_SUCCESS: "Lấy danh sách người dùng thành công",
  FETCH_ONE_SUCCESS: "Lấy thông tin người dùng thành công",
  USER_NOT_FOUND: "Người dùng không tồn tại",
  EMAIL_ALREADY_EXISTS: "Email đã tồn tại",
  INVALID_ROLE: "Vai trò không hợp lệ",
  CREATE_SUCCESS: "Tạo người dùng thành công",
  UPDATE_SUCCESS: "Cập nhật người dùng thành công",
  DELETE_SUCCESS: "Xóa người dùng thành công",
};

export const CustomerMessage = {
  CREATE_SUCCESS: "Tạo khách hàng thành công",
  UPDATE_SUCCESS: "Cập nhật khách hàng thành công",
  DELETE_SUCCESS: "Xóa khách hàng thành công",
  LIST_RETRIEVED: "Danh sách khách hàng được lấy thành công",
  DETAIL_RETRIEVED: "Chi tiết khách hàng được lấy thành công",
  NOT_FOUND: "Khách hàng không tồn tại",
  FORBIDDEN: "Bạn không có quyền",
};

export const VehicleMessage = {
  LIST_SUCCESS: "Lấy danh sách xe thành công",
  DETAIL_SUCCESS: "Lấy chi tiết xe thành công",
  CREATE_SUCCESS: "Tạo xe thành công",
  UPDATE_SUCCESS: "Cập nhật xe thành công",
  DELETE_SUCCESS: "Xóa xe thành công",

  NOT_FOUND: "Xe không tồn tại",
  INVALID_REQUEST: "Dữ liệu xe không hợp lệ",
  MISSING_REQUIRED_FIELDS:
    "Thiếu các trường bắt buộc: sku, name, category, price",
  MISSING_REQUIRED_FIELDS_DISTRIBUTE:
    "Thiếu các trường bắt buộc để phân bổ xe: vehicle_id, dealership_id, quantity, color",
  VEHICLE_DISTRIBUTED_SUCCESS: "Phân bổ xe thành công",
  QUANTITY_MUST_BE_GREATER_THAN_0: "Số lượng phải lớn hơn 0",
  SKU_ALREADY_EXISTS: "Xe với SKU này đã tồn tại",
};

export const OrderMessage = {
  CREATE_SUCCESS: "Đơn hàng được tạo thành công",
  UPDATE_SUCCESS: "Đơn hàng được cập nhật thành công",
  DELETE_SUCCESS: "Đơn hàng được xóa thành công",
  STATUS_UPDATE_SUCCESS: "Trạng thái đơn hàng được cập nhật thành công",
  NOT_FOUND: "Đơn hàng không tồn tại",
  INVALID_STATUS: "Trạng thái đơn hàng không hợp lệ",
  LIST_SUCCESS: "Danh sách đơn hàng được lấy thành công",
  DETAIL_SUCCESS: "Chi tiết đơn hàng được lấy thành công",
  MISSING_REQUIRED_FIELDS: "Thiếu các trường bắt buộc",
  ITEMS_LENGTH_ZERO: "Đơn hàng phải có ít nhất một mục",
};

export const TestDriveMessage = {
  CREATE_SUCCESS: "Đăng ký lái thử thành công",
  LIST_SUCCESS: "Lấy danh sách lái thử thành công",
  INVALID_REQUEST: "Yêu cầu lái thử không hợp lệ",
  MISSING_REQUIRED_FIELDS: "Thiếu các trường bắt buộc",
  CUSTOMER_NOT_FOUND: "Khách hàng không tồn tại",
  VEHICLE_NOT_FOUND: "Xe không tồn tại",
  ASSIGN_SUCCESS: "Nhân viên được phân công cho lái thử thành công",
  STATUS_UPDATE_SUCCESS: "Trạng thái lái thử được cập nhật thành công",
};

export const FeedbackMessage = {
  CREATE_SUCCESS: "Tạo feedback thành công",
  INVALID_REQUEST: "Yêu cầu không hợp lệ",
  RETRIEVED_SUCCESS: "Lấy feedback thành công",
  MISSING_REQUIRED_FIELDS: "Thiếu các trường bắt buộc",
  HANDLER_INVALID: "Người xử lý không hợp lệ",
  NOT_FOUND: "Feedback không tồn tại",
  FORBIDDEN: "Bạn không có quyền truy cập/cập nhật feedback này",
  STATUS_UPDATE_SUCCESS: "Trạng thái feedback được cập nhật thành công",
  COMMENT_ADDED: "Bình luận được thêm thành công",
};

export const ManufacturerMessage = {
  CREATE_SUCCESS: "Tạo hãng thành công",
  LIST_SUCCESS: "Lấy danh sách hãng thành công",
  DETAIL_SUCCESS: "Lấy chi tiết hãng thành công",
  UPDATE_SUCCESS: "Cập nhật hãng thành công",
  DELETE_SUCCESS: "Xóa hãng thành công",

  NOT_FOUND: "Hãng không tồn tại",
  INVALID_REQUEST: "Yêu cầu hãng không hợp lệ",
  NO_STOCK_AVAILABLE:
    "Không có tồn kho của hãng cho màu xe này hoặc xe đã hết hàng",
  //Debts
  DEBTS_RETRIEVED: "Lấy công nợ hãng thành công",
  VEHICLE_CONSUMPTION_RETRIEVED:
    "Lấy thông tin tiêu thụ xe của hãng thành công",
};

export const DealerMessage = {
  // General
  CREATE_SUCCESS: "Tạo đại lý thành công",
  UPDATE_SUCCESS: "Cập nhật đại lý thành công",
  DELETE_SUCCESS: "Xóa đại lý thành công",
  LIST_RETRIEVED: "Lấy danh sách đại lý thành công",
  DETAIL_RETRIEVED: "Lấy chi tiết đại lý thành công",
  DEACTIVATE_SUCCESS: "Đại lý đã được hủy kích hoạt thành công",
  ALREADY_INACTIVE: "Đại lý đã ở trạng thái không hoạt động",
  MANUFACTURER_REQUIRED: "Phải có manufacturer_id để tạo đại lý",
  NOT_FOUND: "Đại lý không tồn tại",
  DEBTS_RETRIEVED: "Lấy công nợ đại lý thành công",
  MISSING_FIELDS: "Thiếu các trường bắt buộc",
  VEHICLE_NOT_FOUND: "Xe không tồn tại hoặc đã xóa",
  REQUEST_NOT_FOUND: "Yêu cầu không tồn tại",

  //Debts
  DEBTS_RETRIEVED: "Lấy công nợ đại lý thành công",

  // Request creation
  REQUEST_CREATED_PENDING:
    "Yêu cầu xe đã được tạo và đang chờ phê duyệt từ hãng.",
  DUPLICATE_REQUEST: "Bạn đã gửi yêu cầu cho xe này với màu này rồi.",
  DELETE_REQUEST_SUCCESS: "Yêu cầu xe đã được xóa thành công.",
  // Approval
  REQUEST_APPROVED: "Yêu cầu xe đã được phê duyệt thành công.",
  REQUEST_REJECTED: "Yêu cầu xe đã bị từ chối.",
  INSUFFICIENT_STOCK: "Hãng không có đủ xe trong kho để duyệt yêu cầu này.",

  // Validation
  REQUEST_ALREADY_PROCESSED: "Yêu cầu xe đã được xử lý trước đó.",
  REQUEST_CANNOT_DELETE: "Không thể xóa yêu cầu đã được xử lý.", // Cannot delete a request that has already been processed.

  // Listing
  REQUEST_LIST_SUCCESS: "Lấy danh sách yêu cầu xe thành công.",
};

export const PromotionMessage = {
  // CRUD cơ bản
  CREATE_SUCCESS: "Khuyến mãi được tạo thành công",
  CREATE_FAILED: "Tạo khuyến mãi thất bại",
  FETCH_SUCCESS: "Lấy danh sách khuyến mãi thành công",
  FETCH_ONE_SUCCESS: "Lấy chi tiết khuyến mãi thành công",
  UPDATE_SUCCESS: "Khuyến mãi được cập nhật thành công",
  DELETE_SUCCESS: "Khuyến mãi được xóa thành công",
  NOT_FOUND: "Khuyến mãi không tồn tại",
  NOT_FOUND_OR_UNAUTHORIZED:
    "Khuyến mãi không tồn tại hoặc không có quyền truy cập",

  // Trạng thái
  ACTIVATED: "Khuyến mãi được kích hoạt thành công",
  DEACTIVATED: "Khuyến mãi được hủy kích hoạt thành công",
  EXPIRED: "Khuyến mãi đã hết hạn",

  // Validation
  INVALID_DATE_RANGE: "Ngày bắt đầu phải trước ngày kết thúc",
  INVALID_TYPE: "Loại khuyến mãi không hợp lệ",
  VALUE_REQUIRED: "Giá trị khuyến mãi là bắt buộc",

  // Phân bổ cho đại lý
  ASSIGN_SUCCESS: "Phân bổ khuyến mãi cho đại lý thành công",
  ASSIGN_FAILED: "Phân bổ khuyến mãi cho đại lý thất bại",
  DUPLICATE_DEALERSHIP: "Khuyến mãi đã được phân bổ cho đại lý này rồi",
  INVALID_DEALERSHIPS: "Danh sách đại lý bất hợp lệ", // Invalid dealership list
  NO_VALID_DEALERSHIP: "Không có đại lý nào hợp lệ", // No valid dealership found
};

export const AccessoryMessage = {
  CREATE_SUCCESS: "Tạo phụ kiện thành công",
  LIST_SUCCESS: "Lấy danh sách phụ kiện thành công",
  DETAIL_SUCCESS: "Lấy chi tiết phụ kiện thành công",
  UPDATE_SUCCESS: "Cập nhật phụ kiện thành công",
  DELETE_SUCCESS: "Xóa phụ kiện thành công",

  NOT_FOUND: "Phụ kiện không tồn tại",
};

export const OptionMessage = {
  CREATE_SUCCESS: "Tạo tùy chọn xe thành công",
  LIST_SUCCESS: "Lấy danh sách tùy chọn xe thành công",
  DETAIL_SUCCESS: "Lấy chi tiết tùy chọn xe thành công",
  UPDATE_SUCCESS: "Cập nhật tùy chọn xe thành công",
  DELETE_SUCCESS: "Xóa tùy chọn xe thành công",

  NOT_FOUND: "Tùy chọn xe không tồn tại",
};

export const RoleMessage = {
  CREATE_SUCCESS: "Tạo role thành công",
  LIST_SUCCESS: "Lấy danh sách role thành công",
  DETAIL_SUCCESS: "Lấy chi tiết role thành công",
  NOT_FOUND: "Role không tồn tại",
  INVALID_REQUEST: "Yêu cầu role không hợp lệ",
  ROLE_ALREADY_EXISTS: "Role đã tồn tại",
};

export const PaymentMessage = {
  CREATE_SUCCESS: "Tạo thanh toán thành công",
  LIST_RETRIEVED: "Lấy danh sách thanh toán thành công",
  MISSING_REQUIRED_FIELDS:
    "Thiếu các trường bắt buộc: order_id, amount, hoặc method",
  MISSING_REQUIRED_FIELDS_UPDATE: "Thiếu field notes ", // Missing required notes field.
  ORDER_NOT_FOUND: "Đơn hàng không tồn tại",
  EXCEEDS_FINAL_AMOUNT: (amount) =>
    `Payment amount exceeds the final order total. You only need to pay ${amount.toLocaleString()} VNĐ more`, // Payment amount exceeds the final order total. You only need to pay ${amount.toLocaleString()} VNĐ more
  ALREADY_FULLY_PAID: "Đơn hàng đã được thanh toán đầy đủ rồi",
  DELETE_SUCCESS: "Xóa thanh toán thành công",
  UPDATE_SUCCESS: "Cập nhật thanh toán thành công",
  NOT_FOUND: "Thanh toán không tồn tại",
  ACCESS_DENIED: "Từ chối truy cập. Thanh toán không thuộc đại lý của bạn.", //. Access denied: Payment not in your dealership
};

export const QuoteMessage = {
  CREATE_SUCCESS: "Tạo báo giá thành công",
  LIST_SUCCESS: "Lấy danh sách báo giá thành công",
  DETAIL_SUCCESS: "Lấy chi tiết báo giá thành công",
  UPDATE_SUCCESS: "Cập nhật báo giá thành công",
  DELETE_SUCCESS: "Xóa báo giá thành công",
  NOT_FOUND: "Báo giá không tồn tại",
  QUOTE_NOT_VALID: "Báo giá không hợp lệ",
  QUOTE_EXPIRED_OR_CANCELED: "Báo giá đã hết hạn hoặc bị hủy",
  QUOTE_ALREADY_CANCELED: "Báo gía đã bị hủy",
  EMPTY_ITEMS: "Báo giá không có mục nào", // empty items
  CANCEL_SUCCESS: "Hủy báo giá thành công",
  DUPLICATE_VEHICLES: "Không cho phép trùng lặp xe trong ", // Duplicate vehicles in quote are not allowed
  PROMOTION_ALREADY_USED: (promotionId) =>
    `Khuyến mãi với ID ${promotionId} đã được sử dụng rồi.`, // Promotion ${promotionId} has already been used
};

/**
 * Order Utilities
 * Helper functions for Order management
 */

/**
 * Tính toán số tiền cuối cùng cho item
 * @param {Object} item - Item object
 * @param {Number} item.price - Base price
 * @param {Number} item.quantity - Quantity
 * @param {Number} item.discount - Discount amount
 * @param {Array} item.options - Options array
 * @param {Array} item.accessories - Accessories array
 * @returns {Promise<Number>} Final amount
 */
export async function calculateItemFinalAmount(item) {
  const {
    price,
    quantity = 1,
    discount = 0,
    options = [],
    accessories = [],
  } = item;

  // --- Options total ---
  const optionsTotal = options.reduce((sum, o) => sum + (o.price || 0), 0);

  // --- Accessories total ---
  const accessoriesTotal = accessories.reduce(
    (sum, a) => sum + (a.price || 0) * (a.quantity || 1),
    0
  );

  // --- Subtotal & final amount ---
  const subtotal = (price + optionsTotal + accessoriesTotal) * quantity;
  const finalAmount = subtotal - discount;

  return finalAmount > 0 ? finalAmount : 0;
}

/**
 * Generate order code theo timestamp
 * @returns {String} Order code (e.g., ORD251028162045)
 */
export function generateOrderCode() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `ORD${yy}${mm}${dd}${hh}${min}${ss}`;
}

/**
 * Lấy label tiếng Việt cho order status
 * @param {String} status - Order status
 * @returns {String} Vietnamese label
 */
export function getStatusLabel(status) {
  const labels = {
    pending: "Chờ xử lý",
    deposit_paid: "Đã cọc",
    waiting_vehicle_request: "Chờ nhập xe",
    vehicle_ready: "Xe sẵn sàng",
    fully_paid: "Đã thanh toán đủ",
    delivered: "Đã giao xe",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
  };
  return labels[status] || status;
}

/**
 * Lấy label tiếng Việt cho payment type
 * @param {String} type - Payment type
 * @returns {String} Vietnamese label
 */
export function getPaymentTypeLabel(type) {
  const labels = {
    deposit: "Tiền cọc",
    final: "Thanh toán cuối",
    full: "Thanh toán đủ",
    refund: "Hoàn tiền",
  };
  return labels[type] || type;
}

/**
 * Format elapsed time giữa 2 mốc thời gian
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date (default: now)
 * @returns {String} Formatted time (e.g., "2 ngày 5 giờ")
 */
export function formatElapsedTime(startDate, endDate = new Date()) {
  if (!startDate) return "N/A";

  const elapsed = endDate - new Date(startDate);
  const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

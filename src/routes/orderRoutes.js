import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {DEALER_ROLES, MANAGEMENT_ROLES, ROLE} from "../enum/roleEnum.js";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  getOrdersForYours,
  payDeposit,
  markVehicleReady,
  payFinalAmount,
  deliverOrder,
  completeOrder,
  cancelOrder,
  getOrderStatusHistory,
  //   getOrderPayments,
} from "../controllers/orderController.js";
import {getPaymentsByOrder} from "../controllers/paymentController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Orders
 *     description: Manage sales orders and quotations
 */

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Create order/quotation (multi-vehicle support)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quote_id
 *               - payment_method
 *             properties:
 *               quote_id:
 *                 type: string
 *                 example: "68d1245b394bfef73a507e47"
 *               payment_method:
 *                 type: string
 *                 enum: [cash, installment]
 *                 default: cash
 *                 example: "cash"
 *           example:
 *             quote_id: "68d1245b394bfef73a507e47"
 *             payment_method: "cash"
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad Request
 */
router.post("/", checkRole(DEALER_ROLES), createOrder);

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags:
 *       - Orders
 *     summary: List orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, deposit_paid, waiting_vehicle_request, waiting_bank_approval, vehicle_ready, fully_paid, delivered, completed, canceled]
 *         description: |
 *           Lọc theo trạng thái đơn hàng. - DEALER_MANAGER only
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: |
 *           Tìm kiếm theo mã đơn hàng, ID khách hàng hoặc ID saler.
 *           - Nếu `q` trùng với `_id` của Order → lọc theo đơn đó.
 *           - Nếu `q` trùng với `_id` của Customer → lọc các đơn của khách đó.
 *           - Nếu `q` trùng với `_id` của Salesperson → lọc các đơn do nhân viên đó phụ trách.
 *           - Nếu `q` là chuỗi thông thường → tìm theo mã đơn hàng (`code`) gần đúng.
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng phù hợp
 */
router.get("/", checkRole(ROLE.DEALER_MANAGER), getOrders);

/**
 * @openapi
 * /api/orders/yourself:
 *   get:
 *     tags:
 *       - Orders
 *     summary: List orders of yourself
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, deposit_paid, waiting_vehicle_request, waiting_bank_approval, vehicle_ready, fully_paid, delivered, completed, canceled]
 *         description: |
 *           Lọc theo trạng thái đơn hàng.
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: |
 *           Tìm kiếm theo mã đơn hàng, ID khách hàng hoặc ID saler.
 *           - Nếu `q` trùng với `_id` của Order → lọc theo đơn đó.
 *           - Nếu `q` trùng với `_id` của Customer → lọc các đơn của khách đó.
 *           - Nếu `q` trùng với `_id` của Salesperson → lọc các đơn do nhân viên đó phụ trách.
 *           - Nếu `q` là chuỗi thông thường → tìm theo mã đơn hàng (`code`) gần đúng.
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng phù hợp
 */
router.get("/yourself", checkRole(DEALER_ROLES), getOrdersForYours);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get order by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.get("/:id", checkRole(DEALER_ROLES), getOrderById);

/**
 * @openapi
 * /api/orders/{id}/pay-deposit:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Khách hàng cọc tiền + Upload hợp đồng + Check stock
 *     description: |
 *       API quan trọng nhất trong luồng bán hàng.
 *
 *       Chức năng:
 *       1. Nhận tiền cọc từ khách hàng
 *       2. Check stock tại đại lý:
 *          - Nếu CÓ xe: Trừ stock ngay (giữ chỗ) → status = "deposit_paid"
 *          - Nếu HẾT xe: Tạo OrderRequest lên hãng → status = "waiting_vehicle_request"
 *       3. Tạo công nợ (Debt)
 *       4. Tạo hóa đơn payment
 *       5. Ghi log order status
 *
 *       Yêu cầu: Order phải ở trạng thái "pending"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deposit_amount
 *               - payment_method
 *             properties:
 *               deposit_amount:
 *                 type: number
 *                 description: Số tiền cọc (VD 10% của final_amount)
 *                 example: 50000000
 *               payment_method:
 *                 type: string
 *                 enum: [cash, bank, qr, card]
 *                 description: Phương thức thanh toán
 *                 example: "bank"
 *               notes:
 *                 type: string
 *                 description: Ghi chú
 *                 example: "Khách cọc qua chuyển khoản"
 *     responses:
 *       200:
 *         description: Đã nhận tiền cọc thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   type: object
 *                   description: Order đã được cập nhật
 *                 payment:
 *                   type: object
 *                   description: Payment record
 *                 has_stock:
 *                   type: boolean
 *                   description: true = có xe, false = hết xe
 *                 order_request:
 *                   type: object
 *                   description: OrderRequest (nếu hết xe)
 *       400:
 *         description: Bad Request (order không pending, số tiền không hợp lệ)
 *       404:
 *         description: Order không tồn tại
 */
router.post("/:id/pay-deposit", checkRole(DEALER_ROLES), payDeposit);

/**
 * @openapi
 * /api/orders/{id}/mark-vehicle-ready:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Đánh dấu xe đã sẵn sàng, thông báo khách thanh toán
 *     description: |
 *       Chuyển order từ "deposit_paid" hoặc "waiting_vehicle_request" → "vehicle_ready".
 *
 *       **Khi nào dùng:**
 *       - Xe có sẵn (deposit_paid): Đã chuẩn bị xe xong, sẵn sàng giao
 *       - Xe từ hãng (waiting_vehicle_request): Hãng đã approve, xe đã về và chuẩn bị xong
 *
 *       **Sau khi ready:** Liên hệ khách đến thanh toán số tiền còn lại và nhận xe
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle_images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URL ảnh xe đã chuẩn bị (optional)
 *                 example: ["https://cloudinary.com/image1.jpg", "https://cloudinary.com/image2.jpg"]
 *               preparation_notes:
 *                 type: string
 *                 description: Ghi chú về việc chuẩn bị xe
 *                 example: "Đã kiểm tra và vệ sinh xe, đổ đầy nhiên liệu"
 *               expected_pickup_date:
 *                 type: string
 *                 format: date
 *                 description: Ngày dự kiến khách có thể đến lấy xe
 *                 example: "2025-01-15"
 *     responses:
 *       200:
 *         description: Xe đã được đánh dấu sẵn sàng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                 remaining_amount:
 *                   type: number
 *                   description: Số tiền khách còn phải trả
 *       400:
 *         description: Order không ở trạng thái phù hợp
 *       404:
 *         description: Order không tồn tại
 */
router.patch(
  "/:id/mark-vehicle-ready",
  checkRole(DEALER_ROLES),
  markVehicleReady
);

// /**
//  * @openapi
//  * /api/orders/{id}/pay-final:
//  *   post:
//  *     tags:
//  *       - Orders
//  *     summary: Thanh toán số tiền còn lại
//  *     description: |
//  *       Chuyển order từ "vehicle_ready" → "fully_paid".
//  *
//  *       **Luồng:** Xe đã sẵn sàng → Khách đến thanh toán nốt → Sẵn sàng giao xe
//  *
//  *       **Chức năng:**
//  *       - Tính số tiền còn lại (final_amount - paid_amount)
//  *       - Nhận thanh toán từ khách
//  *       - Cập nhật Debt thành "settled"
//  *       - Chuyển status → fully_paid
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Order ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - payment_method
//  *             properties:
//  *               payment_method:
//  *                 type: string
//  *                 enum: [cash, bank, qr, card]
//  *                 example: "cash"
//  *               notes:
//  *                 type: string
//  *                 example: "Thanh toán phần còn lại"
//  *     responses:
//  *       200:
//  *         description: Thanh toán thành công
//  *       400:
//  *         description: Order không ở trạng thái vehicle_ready
//  *       404:
//  *         description: Order không tồn tại
//  */
// router.post("/:id/pay-final", checkRole(DEALER_ROLES), payFinalAmount);

/**
 * @openapi
 * /api/orders/{id}/deliver:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Giao xe cho khách hàng
 *     description: |
 *       Chuyển order từ "fully_paid" → "delivered".
 *
 *       **Luồng:** Đã thanh toán đủ → Giao xe cho khách → Hoàn tất giao dịch
 *
 *       **Chức năng:**
 *       - Cập nhật thông tin giao xe (người giao, người nhận)
 *       - Upload giấy tờ xe, biên bản bàn giao
 *       - Ghi nhận thời gian giao xe
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient_info
 *             properties:
 *               delivery_person:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   id_card:
 *                     type: string
 *               recipient_info:
 *                 type: object
 *                 required:
 *                   - name
 *                   - phone
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Nguyễn Văn A"
 *                   phone:
 *                     type: string
 *                     example: "0912345678"
 *                   relationship:
 *                     type: string
 *                     example: "Chính chủ"
 *               delivery_documents:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     file_url:
 *                       type: string
 *               delivery_notes:
 *                 type: string
 *               actual_delivery_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Giao xe thành công
 *       400:
 *         description: Order không ở trạng thái fully_paid hoặc thiếu thông tin
 *       404:
 *         description: Order không tồn tại
 */
router.patch("/:id/deliver", checkRole(DEALER_ROLES), deliverOrder);

/**
 * @openapi
 * /api/orders/{id}/complete:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Hoàn tất đơn hàng (đóng hồ sơ)
 *     description: |
 *       Chuyển order từ "delivered" → "completed".
 *
 *       **Luồng:** Đã giao xe → Chờ 1-2 ngày → Hoàn tất đơn hàng
 *
 *       **Chức năng:**
 *       - Đóng hoàn toàn hồ sơ đơn hàng
 *       - Ghi nhận hoàn tất thành công
 *
 *       **Yêu cầu:** Order phải delivered ít nhất 1 ngày
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completion_notes:
 *                 type: string
 *                 description: Ghi chú khi hoàn tất
 *                 example: "Khách hàng hài lòng với dịch vụ"
 *     responses:
 *       200:
 *         description: Hoàn tất đơn hàng thành công
 *       400:
 *         description: Order không ở trạng thái delivered hoặc chưa đủ thời gian
 *       404:
 *         description: Order không tồn tại
 */
router.patch("/:id/complete", checkRole(DEALER_ROLES), completeOrder);

// /**
//  * @openapi
//  * /api/orders/{id}/cancel:
//  *   post:
//  *     tags:
//  *       - Orders
//  *     summary: Huỷ đơn hàng với hoàn tiền tự động
//  *     description: |
//  *       Huỷ đơn hàng ở bất kỳ trạng thái nào (trừ completed).
//  *
//  *       **Luồng hoàn tiền tự động:**
//  *       - Hoàn lại tiền đã cọc/thanh toán (tạo payment refund)
//  *       - Hoàn lại stock nếu đã trừ
//  *       - Huỷ công nợ (debt) nếu có
//  *       - Huỷ OrderRequest nếu đang chờ xe từ hãng
//  *
//  *       **Yêu cầu:**
//  *       - Order không được ở trạng thái "completed" hoặc "canceled"
//  *       - Bắt buộc cung cấp lý do huỷ
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Order ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - cancellation_reason
//  *             properties:
//  *               cancellation_reason:
//  *                 type: string
//  *                 description: Lý do huỷ đơn hàng (bắt buộc)
//  *                 example: "Khách hàng không có nhu cầu mua xe nữa"
//  *               refund_method:
//  *                 type: string
//  *                 enum: [cash, bank, qr, card]
//  *                 default: cash
//  *                 description: Phương thức hoàn tiền
//  *                 example: "bank"
//  *     responses:
//  *       200:
//  *         description: Huỷ đơn hàng thành công
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 order:
//  *                   type: object
//  *                 refund_summary:
//  *                   type: object
//  *                   properties:
//  *                     refunded:
//  *                       type: boolean
//  *                     refund_amount:
//  *                       type: number
//  *                     refund_payments:
//  *                       type: array
//  *                 stock_restored:
//  *                   type: boolean
//  *                 debt_canceled:
//  *                   type: boolean
//  *                 request_canceled:
//  *                   type: boolean
//  *       400:
//  *         description: Order không thể huỷ hoặc thiếu lý do
//  *       404:
//  *         description: Order không tồn tại
//  */
// router.post("/:id/cancel", checkRole(DEALER_ROLES), cancelOrder);

/**
 * @openapi
 * /api/orders/{id}/status-history:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Lấy lịch sử thay đổi trạng thái đơn hàng (timeline)
 *     description: |
 *       Truy vấn tất cả các sự kiện thay đổi trạng thái của đơn hàng.
 *
 *       **Thông tin trả về:**
 *       - Danh sách các sự kiện (mới nhất → cũ nhất)
 *       - Trạng thái cũ/mới
 *       - Người thực hiện thay đổi
 *       - Thời gian và ghi chú
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Lịch sử trạng thái đơn hàng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order_code:
 *                   type: string
 *                 current_status:
 *                   type: string
 *                 total_events:
 *                   type: number
 *                 timeline:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       timestamp:
 *                         type: string
 *                       old_status:
 *                         type: string
 *                       new_status:
 *                         type: string
 *                       status_label:
 *                         type: string
 *                       changed_by:
 *                         type: object
 *                       notes:
 *                         type: string
 *                       elapsed_time:
 *                         type: string
 *       404:
 *         description: Order không tồn tại
 */
router.get(
  "/:id/status-history",
  checkRole(DEALER_ROLES),
  getOrderStatusHistory
);

/**
 * @openapi
 * /api/orders/{id}/payments:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Lấy tổng hợp thanh toán của đơn hàng
 *     description: |
 *       Xem tất cả các giao dịch thanh toán liên quan đến đơn hàng.
 *
 *       **Thông tin bao gồm:**
 *       - Danh sách payments (deposit, final, refund)
 *       - Tổng hợp: Tổng đã trả, tổng hoàn, còn lại
 *       - Tiến độ thanh toán (%)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Chi tiết thanh toán đơn hàng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                     status:
 *                       type: string
 *                     final_amount:
 *                       type: number
 *                     paid_amount:
 *                       type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_order_amount:
 *                       type: number
 *                     total_deposit:
 *                       type: number
 *                     total_final:
 *                       type: number
 *                     total_paid:
 *                       type: number
 *                     total_refunded:
 *                       type: number
 *                     net_paid:
 *                       type: number
 *                     remaining_amount:
 *                       type: number
 *                     payment_progress:
 *                       type: number
 *                       description: Phần trăm đã thanh toán (0-100)
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       payment_type:
 *                         type: string
 *                       payment_type_label:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       payment_method:
 *                         type: string
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                 payment_count:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     deposit:
 *                       type: number
 *                     final:
 *                       type: number
 *                     refund:
 *                       type: number
 */
router.get("/:id/payments", checkRole(DEALER_ROLES), getPaymentsByOrder);

/**
 * @openapi
 * /api/orders/{id}:
 *   put:
 *     tags:
 *       - Orders
 *     summary: Update order items, payment_method and notes
 *     description: |
 *       Replaces items with provided list and recalculates per-item and total amounts based on current vehicle price, discounts, promotions, options and accessories.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [vehicle_id]
 *                   properties:
 *                     vehicle_id: { type: string }
 *                     color:
 *                       type: string
 *                       description: Vehicle color to deduct stock from. If omitted, stock will be deducted across available colors.
 *                     quantity: { type: number, default: 1 }
 *                     discount: { type: number, default: 0 }
 *                     promotion_id: { type: string }
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           option_id: { type: string }
 *                     accessories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           accessory_id: { type: string }
 *                           quantity: { type: number, default: 1 }
 *               payment_method:
 *                 type: string
 *                 enum: [cash, paypal, zalopay, installment]
 *               notes: { type: string }
 *           example:
 *             items:
 *               - vehicle_id: "68d39a14fde880da56c7f0d0"
 *                 color: "Blue"
 *                 quantity: 1
 *                 discount: 1000
 *                 promotion_id: "68d504d4a9f9cdb6420c9682"
 *                 options:
 *                   - option_id: "68d137662d41dc0589f4c9a4"
 *                 accessories:
 *                   - accessory_id: "68d137ac2d41dc0589f4c9ab"
 *                     quantity: 1
 *             payment_method: "cash"
 *             notes: "Customer updated configuration"
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.put("/:id", checkRole(DEALER_ROLES), updateOrder);

/**
 * @openapi
 * /api/orders/{id}:
 *   delete:
 *     tags:
 *       - Orders
 *     summary: Delete order - Cancel order and refund all payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: |
 *           Xóa order. - DEALER_MANAGER only
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.delete("/:id", checkRole(MANAGEMENT_ROLES), deleteOrder);

/**
 * @openapi
 * /api/orders/{id}/status:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Update order status and optionally paid amount
 *     description: |
 *       Transition allowed:
 *       - pending -> deposit_paid
 *       - deposit_paid -> vehicle_ready | waiting_vehicle_request
 *       - waiting_vehicle_request -> vehicle_ready
 *       - vehicle_ready -> fully_paid
 *       - fully_paid -> delivered
 *       - delivered -> completed
 *       Also allows updating paid amount for the order to reflect customer payment.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order _id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, deposit_paid, waiting_vehicle_request, waiting_bank_approval, vehicle_ready, fully_paid, delivered, completed, canceled]
 *           example:
 *             status: "fully_paid"
 *     responses:
 *       200:
 *         description: OK, order status updated and paid amount recorded
 *       400:
 *         description: Bad Request (invalid status or paid_amount)
 *       404:
 *         description: Order not found
 */
router.patch("/:id/status", checkRole(DEALER_ROLES), updateOrderStatus);

export default router;

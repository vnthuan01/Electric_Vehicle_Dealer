import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {DEALER_ROLES, ROLE, ROLES} from "../enum/roleEnum.js";
import {
  createOrderRequest,
  listOrderRequests,
  approveOrderRequest,
  rejectOrderRequest,
  getOrderRequestById,
  listMyOrderRequests,
} from "../controllers/orderRequestController.js";

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Order Requests
 *     description: Manage dealer requests for new vehicle orders
 */

/**
 * @openapi
 * /api/order-request:
 *   post:
 *     tags:
 *       - Order Requests
 *     summary: Dealer staff tạo yêu cầu đặt hàng theo nhu cầu
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 description: Danh sách xe cần yêu cầu
 *                 items:
 *                   type: object
 *                   required: [vehicle_id]
 *                   properties:
 *                     vehicle_id:
 *                       type: string
 *                       example: "68d39a14fde880da56c7f0d0"
 *                     color:
 *                       type: string
 *                       example: "Đỏ"
 *                     quantity:
 *                       type: number
 *                       example: 2
 *               notes:
 *                 type: string
 *                 example: "Yêu cầu tổng hợp nhiều dòng xe"
 *     responses:
 *       201:
 *         description: Yêu cầu được tạo thành công
 *       400:
 *         description: Thiếu dữ liệu hoặc không hợp lệ
 */
router.post("/", checkRole([ROLE.DEALER_STAFF]), createOrderRequest);

/**
 * @openapi
 * /api/order-request:
 *   get:
 *     tags:
 *       - Order Requests
 *     summary: Danh sách yêu cầu đặt hàng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo mã yêu cầu
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Từ ngày (ISO)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: Đến ngày (ISO)
 *     responses:
 *       200:
 *         description: Danh sách yêu cầu được trả về
 */
router.get(
  "/",
  checkRole([...DEALER_ROLES, ROLE.EVM_STAFF]),
  listOrderRequests
);

/**
 * @openapi
 * /api/order-request/my:
 *   get:
 *     tags:
 *       - Order Requests
 *     summary: Danh sách yêu cầu đặt hàng của chính người dùng
 *     description: Trả về danh sách các OrderRequest mà người dùng hiện tại đã tạo, có thể lọc theo trạng thái, mã, hoặc khoảng thời gian.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái của yêu cầu đặt hàng
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo mã yêu cầu (code)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Lọc từ ngày tạo (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Lọc đến ngày tạo (ISO 8601)
 *     responses:
 *       200:
 *         description: Danh sách OrderRequest của người dùng được trả về thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: My order requests retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDocs:
 *                       type: integer
 *                       example: 5
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 674cb3aa1fb3f92d6c88ad35
 *                           code:
 *                             type: string
 *                             example: ORQ-2025-001
 *                           status:
 *                             type: string
 *                             example: pending
 *                           requested_by:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 674cb1231fb3f92d6c88acde
 *                               full_name:
 *                                 type: string
 *                                 example: Nguyễn Văn A
 *                               email:
 *                                 type: string
 *                                 example: nguyenvana@example.com
 *                           approved_by:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 674cb2231fb3f92d6c88acdf
 *                               full_name:
 *                                 type: string
 *                                 example: Trần Thị B
 *                               email:
 *                                 type: string
 *                                 example: tranthib@example.com
 *                           rejected_by:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 674cb3231fb3f92d6c88ace0
 *                               full_name:
 *                                 type: string
 *                                 example: Lê Văn C
 *                               email:
 *                                 type: string
 *                                 example: levanc@example.com
 *                           dealership_id:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 674cb4561fb3f92d6c88af11
 *                               name:
 *                                 type: string
 *                                 example: Toyota Hà Nội
 *                           order_id:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 674cb5561fb3f92d6c88af12
 *                               code:
 *                                 type: string
 *                                 example: ORD-2025-001
 *                               status:
 *                                 type: string
 *                                 example: pending
 */
router.get("/my", checkRole(DEALER_ROLES), listMyOrderRequests);

/**
 * @openapi
 * /api/order-request/{id}:
 *   get:
 *     tags:
 *       - Order Requests
 *     summary: Lấy chi tiết yêu cầu đặt hàng theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của Order Request
 *     responses:
 *       200:
 *         description: Chi tiết yêu cầu đặt hàng được trả về
 *       404:
 *         description: Không tìm thấy yêu cầu
 */
router.get(
  "/:id",
  checkRole([...DEALER_ROLES, ROLE.EVM_STAFF]),
  getOrderRequestById
);

/**
 * @openapi
 * /api/order-request/{id}/approve:
 *   patch:
 *     tags:
 *       - Order Requests
 *     summary: Duyệt yêu cầu đặt hàng → tự động tạo Order mới
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của Order Request
 *     responses:
 *       200:
 *         description: Yêu cầu đã được duyệt và tạo Order
 *       404:
 *         description: Không tìm thấy yêu cầu
 */
router.patch(
  "/:id/approve",
  checkRole([ROLE.DEALER_MANAGER]),
  approveOrderRequest
);

/**
 * @openapi
 * /api/order-request/{id}/reject:
 *   patch:
 *     tags:
 *       - Order Requests
 *     summary: Từ chối yêu cầu đặt hàng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của Order Request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Thông tin sai / hãng từ chối phân bổ xe"
 *     responses:
 *       200:
 *         description: Yêu cầu đã bị từ chối
 *       400:
 *         description: Trạng thái không hợp lệ
 *       404:
 *         description: Không tìm thấy yêu cầu
 */
router.patch(
  "/:id/reject",
  checkRole([ROLE.DEALER_MANAGER, ROLE.EVM_STAFF]),
  rejectOrderRequest
);

export default router;

import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {DEALER_ROLES, ROLE} from "../enum/roleEnum.js";
import {
  requestOrderAccordingToDemand,
  listOrderRequests,
  approveOrderRequestMethodCash,
  rejectOrderRequest,
} from "../controllers/orderController.js";

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
router.post("/", checkRole([ROLE.DEALER_STAFF]), requestOrderAccordingToDemand);

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
  approveOrderRequestMethodCash
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

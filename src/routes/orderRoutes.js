import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {DEALER_ROLES, MANAGEMENT_ROLES} from "../enum/roleEnum.js";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";

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
 *     summary: Create order/quotation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - customer_id
 *               - vehicle_id
 *               - price
 *             properties:
 *               code:
 *                 type: string
 *               customer_id:
 *                 type: string
 *               vehicle_id:
 *                 type: string
 *               dealership_id:
 *                 type: string
 *               salesperson_id:
 *                 type: string
 *               price:
 *                 type: number
 *               discount:
 *                 type: number
 *               promotion_id:
 *                 type: string
 *               final_amount:
 *                 type: number
 *               payment_method:
 *                 type: string
 *                 enum: [cash, transfer, installment]
 *               status:
 *                 type: string
 *                 enum: [quote, confirmed, contract_signed, delivered]
 *               notes:
 *                 type: string
 *           example:
 *             code: "ORD-2025-0001"
 *             customer_id: "66fbca1234567890abcdef01"
 *             vehicle_id: "66fbca9876543210abcdef02"
 *             dealership_id: "66fbca456789abcd1234ef03"
 *             salesperson_id: "66fbca7890abcdef12345604"
 *             price: 30000
 *             discount: 2000
 *             promotion_id: "66fbca1112131415abcd1607"
 *             final_amount: 28000
 *             payment_method: "installment"
 *             status: "quote"
 *             notes: "Khách hàng yêu cầu giao xe trong tháng 10"
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad Request
 */
router.post(
  "/",
  checkRole([...DEALER_ROLES, ...MANAGEMENT_ROLES]),
  createOrder
);

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
 *           enum: [quote, confirmed, contract_signed, delivered]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/", checkRole([...DEALER_ROLES, ...MANAGEMENT_ROLES]), getOrders);

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
router.get(
  "/:id",
  checkRole([...DEALER_ROLES, ...MANAGEMENT_ROLES]),
  getOrderById
);

/**
 * @openapi
 * /api/orders/{id}:
 *   put:
 *     tags:
 *       - Orders
 *     summary: Update order (price/discount/promotion/payment_method/notes)
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
 *               price: { type: number }
 *               discount: { type: number }
 *               promotion_id: { type: string }
 *               final_amount: { type: number }
 *               payment_method:
 *                 type: string
 *                 enum: [cash, transfer, installment]
 *               notes: { type: string }
 *           example:
 *             price: 32000
 *             discount: 1500
 *             promotion_id: "66fbca2222333344abcd5508"
 *             final_amount: 30500
 *             payment_method: "transfer"
 *             notes: "Khách hàng đổi phương thức thanh toán"
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.put(
  "/:id",
  checkRole([...DEALER_ROLES, ...MANAGEMENT_ROLES]),
  updateOrder
);

/**
 * @openapi
 * /api/orders/{id}:
 *   delete:
 *     tags:
 *       - Orders
 *     summary: Delete order
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
router.delete("/:id", checkRole(MANAGEMENT_ROLES), deleteOrder);

/**
 * @openapi
 * /api/orders/{id}/status:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Update order status
 *     description: |
 *       Transition allowed:
 *       - quote -> confirmed
 *       - confirmed -> contract_signed
 *       - contract_signed -> delivered
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [quote, confirmed, contract_signed, delivered]
 *           example:
 *             status: "confirmed"
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Bad Request
 *       404:
 *         description: Not Found
 */
router.patch("/:id/status", checkRole(DEALER_ROLES), updateOrderStatus);

export default router;

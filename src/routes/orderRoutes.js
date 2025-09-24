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
  paypalReturn,
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
 *               - customer_id
 *               - items
 *             properties:
 *               customer_id:
 *                 type: string
 *               dealership_id:
 *                 type: string
 *               payment_method:
 *                 type: string
 *                 enum: [cash, paypal, zalopay, installment]
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 description: List of vehicles in the order
 *                 items:
 *                   type: object
 *                   required:
 *                     - vehicle_id
 *                     - price
 *                   properties:
 *                     vehicle_id:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       default: 1
 *                     price:
 *                       type: number
 *                     discount:
 *                       type: number
 *                       default: 0
 *                     promotion_id:
 *                       type: string
 *           example:
 *             customer_id: "66fbca1234567890abcdef01"
 *             dealership_id: "66fbca456789abcd1234ef03"
 *             payment_method: "paypal"
 *             notes: "Khách hàng muốn giao nhiều loại xe trong tháng 10"
 *             items:
 *               - vehicle_id: "66fbca9876543210abcdef02"
 *                 quantity: 2
 *                 price: 30000
 *                 discount: 2000
 *                 promotion_id: "66fbca1112131415abcd1607"
 *               - vehicle_id: "66fbcaabcdef9876543210"
 *                 quantity: 1
 *                 price: 45000
 *                 discount: 0
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
 * /api/orders/{id}/paypal-capture:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Capture PayPal order after user approval
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Your internal order _id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: PayPal order token from query param
 *           example:
 *             token: "EC-XXXXXX"
 *     responses:
 *       200:
 *         description: Capture successful
 *       400:
 *         description: Bad Request
 *       404:
 *         description: Order Not Found
 *       500:
 *         description: PayPal capture failed
 */
router.post(
  "/:id/paypal-capture",
  checkRole([...DEALER_ROLES, ...MANAGEMENT_ROLES]),
  paypalReturn
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
 *     summary: Update order status and optionally paid amount
 *     description: |
 *       Transition allowed:
 *       - quote -> confirmed
 *       - confirmed -> contract_signed
 *       - contract_signed -> delivered
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
 *                 enum: [quote, confirmed, contract_signed, delivered]
 *               paid_amount:
 *                 type: number
 *                 description: Amount paid by the customer
 *           example:
 *             status: "confirmed"
 *             paid_amount: 15000
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

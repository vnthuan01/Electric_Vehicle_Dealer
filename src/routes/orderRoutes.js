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
 *                 example: "68d1245b394bfef73a507e47"
 *               dealership_id:
 *                 type: string
 *                 example: "68d0e8a599679399fff9869a"
 *               payment_method:
 *                 type: string
 *                 enum: [cash, installment]
 *                 default: cash
 *                 example: "cash"
 *               notes:
 *                 type: string
 *                 example: "Khách hàng muốn giao xe trong tháng 10/ Kèm 2 accessories và 2 options"
 *               items:
 *                 type: array
 *                 description: List of vehicles in the order
 *                 items:
 *                   type: object
 *                   required:
 *                     - vehicle_id
 *                   properties:
 *                     vehicle_id:
 *                       type: string
 *                       example: "68d39a14fde880da56c7f0d0"
 *                     color:
 *                       type: string
 *                       description: Vehicle color to deduct stock from. If omitted, stock will be deducted across available colors.
 *                       example: "Red"
 *                     quantity:
 *                       type: number
 *                       default: 1
 *                       example: 1
 *                     discount:
 *                       type: number
 *                       default: 0
 *                       example: 2000
 *                     promotion_id:
 *                       type: string
 *                       example: "68d504d4a9f9cdb6420c9682"
 *                     options:
 *                       type: array
 *                       description: List of options for this vehicle. Accepts objects with option_id (recommended). Also supports plain string ObjectIds.
 *                       items:
 *                         type: object
 *                         required:
 *                           - option_id
 *                         properties:
 *                           option_id:
 *                             type: string
 *                             example: "68d137662d41dc0589f4c9a4"
 *                     accessories:
 *                       type: array
 *                       description: List of accessories selected for this vehicle
 *                       items:
 *                         type: object
 *                         required:
 *                           - accessory_id
 *                           - quantity
 *                         properties:
 *                           accessory_id:
 *                             type: string
 *                             example: "68d137ac2d41dc0589f4c9ab"
 *                           quantity:
 *                             type: number
 *                             default: 1
 *                             example: 2
 *           example:
 *             customer_id: "68d1245b394bfef73a507e47"
 *             payment_method: "cash"
 *             notes: "Khách hàng muốn giao xe trong tháng 10/ Kèm 2 accessories và 2 options"
 *             items:
 *               - vehicle_id: "68d39a14fde880da56c7f0d0"
 *                 color: "Red"
 *                 quantity: 1
 *                 discount: 2000
 *                 promotion_id: "68d504d4a9f9cdb6420c9682"
 *                 options:
 *                   - option_id: "68d137662d41dc0589f4c9a4"
 *                   - option_id: "68d137662d41dc0589f4c9a3"
 *                 accessories:
 *                   - accessory_id: "68d137ac2d41dc0589f4c9ab"
 *                     quantity: 2
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

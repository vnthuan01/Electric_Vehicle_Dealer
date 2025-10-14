import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {DEALER_ROLES} from "../enum/roleEnum.js";
import {
  createPayment,
  getPaymentsByOrder,
  deletePayment,
  updatePayment,
  getPaymentById,
} from "../controllers/paymentController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/payments:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create new payment for an order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - amount
 *               - method
 *             properties:
 *               order_id:
 *                 type: string
 *               amount:
 *                 type: number
 *               method:
 *                 type: string
 *                 enum: [cash, bank, qr, card]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad Request
 */
router.post("/", checkRole(DEALER_ROLES), createPayment);

/**
 * @openapi
 * /api/payments/order/{orderId}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get all payments of an order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get("/order/:orderId", getPaymentsByOrder);

/**
 * @openapi
 * /api/payments/{id}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment by ID
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
 *         description: Payment detail
 *       404:
 *         description: Payment not found
 */
router.get("/:id", checkRole(DEALER_ROLES), getPaymentById);

/**
 * @openapi
 * /api/payments/{id}:
 *   put:
 *     tags:
 *       - Payments
 *     summary: Update payment info (amount, method, notes)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Payment not found
 */
router.put("/:id", checkRole(DEALER_ROLES), updatePayment);

/**
 * @openapi
 * /api/payments/{id}:
 *   delete:
 *     tags:
 *       - Payments
 *     summary: Cancel/delete payment (revert paid_amount in Order)
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
 *         description: Payment deleted
 *       404:
 *         description: Payment not found
 */
router.delete("/:id", checkRole(DEALER_ROLES), deletePayment);

export default router;

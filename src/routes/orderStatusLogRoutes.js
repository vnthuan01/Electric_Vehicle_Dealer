import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import { DEALER_ROLES } from "../enum/roleEnum.js";
import {
  getOrderStatusLogs,
  getDealershipStatusLogs,
  getStatusLogById,
  getOrderStatusHistory,
  getStatusStatistics,
} from "../controllers/orderStatusLogController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/order-status-logs/orders/{order_id}:
 *   get:
 *     tags: [Order Status Logs]
 *     summary: Get status logs for specific order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status logs retrieved
 *       404:
 *         description: Order not found
 */
router.get("/orders/:order_id", checkRole(DEALER_ROLES), getOrderStatusLogs);

/**
 * @openapi
 * /api/order-status-logs/orders/{order_id}/history:
 *   get:
 *     tags: [Order Status Logs]
 *     summary: Get complete status history timeline for order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order history timeline retrieved
 *       404:
 *         description: Order not found
 */
router.get(
  "/orders/:order_id/history",
  checkRole(DEALER_ROLES),
  getOrderStatusHistory
);

/**
 * @openapi
 * /api/order-status-logs:
 *   get:
 *     tags: [Order Status Logs]
 *     summary: Get all status logs for dealership with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, halfPayment, fullyPayment, contract_signed, delivered, canceled]
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Status logs retrieved
 */
router.get("/", checkRole(DEALER_ROLES), getDealershipStatusLogs);

/**
 * @openapi
 * /api/order-status-logs/statistics:
 *   get:
 *     tags: [Order Status Logs]
 *     summary: Get status change statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Statistics retrieved
 */
router.get("/statistics", checkRole(DEALER_ROLES), getStatusStatistics);

/**
 * @openapi
 * /api/order-status-logs/{id}:
 *   get:
 *     tags: [Order Status Logs]
 *     summary: Get specific status log by ID
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
 *         description: Status log retrieved
 *       404:
 *         description: Status log not found
 */
router.get("/:id", checkRole(DEALER_ROLES), getStatusLogById);

export default router;

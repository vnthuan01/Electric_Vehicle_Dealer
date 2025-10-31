import express from "express";
import {
  getDealerDebts,
  listCustomerDebts,
  listManufacturerDebts,
  getDealerManufacturerDebtById,
  getCustomerDebtByOrder,
  getDealerManufacturerDebtByRequest,
} from "../controllers/debtController.js";
import { DEALER_ROLES } from "../enum/roleEnum.js";
import { checkRole } from "../middlewares/checkRole.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticate);
/**
 * @openapi
 * tags:
 *   - name: Debts
 *     description: Manage debts for dealers, customers, and manufacturers
 */

/**
 * @openapi
 * /api/debts/customers:
 *   get:
 *     tags: [Debts]
 *     summary: Get customer debts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer debts retrieved successfully
 */
router.get("/customers", listCustomerDebts);

/**
 * @openapi
 * /api/debts/manufacturers:
 *   get:
 *     tags: [Debts]
 *     summary: Get dealer-manufacturer debts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dealer-Manufacturer debts retrieved successfully
 */
router.get("/manufacturers", listManufacturerDebts);

/**
 * @openapi
 * /api/debts/manufacturers/{id}:
 *   get:
 *     tags: [Debts]
 *     summary: Get a specific dealer-manufacturer debt by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Debt ID
 *     responses:
 *       200:
 *         description: Debt details retrieved successfully
 *       404:
 *         description: Debt not found
 */
router.get("/manufacturers/:id", getDealerManufacturerDebtById);

/**
 * @openapi
 * /api/debts/manufacturers/request/{requestId}:
 *   get:
 *     tags: [Debts]
 *     summary: Get dealer-manufacturer debt by RequestVehicle (batch)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: RequestVehicle ID (batch/lô hàng)
 *     responses:
 *       200:
 *         description: Dealer-manufacturer debt for request retrieved
 *       404:
 *         description: Not found
 */
router.get(
  "/manufacturers/request/:requestId",
  getDealerManufacturerDebtByRequest
);

/**
 * @openapi
 * /api/debts:
 *   get:
 *     tags: [Debts]
 *     summary: Get debts for logged-in dealer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dealer debts retrieved successfully
 */
router.get("/", checkRole(DEALER_ROLES), getDealerDebts);

/**
 * @openapi
 * /api/debts/customers/order/{orderId}:
 *   get:
 *     tags: [Debts]
 *     summary: Get customer debt by order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Customer debt for order retrieved
 *       404:
 *         description: Debt not found for this order
 */
router.get("/customers/order/:orderId", getCustomerDebtByOrder);

export default router;

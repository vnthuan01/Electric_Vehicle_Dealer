import express from "express";
import {
  getDealerDebts,
  listCustomerDebts,
  listManufacturerDebts,
} from "../controllers/debtController.js";
import {DEALER_ROLES} from "../enum/roleEnum.js";
import {checkRole} from "../middlewares/checkRole.js";
import {authenticate} from "../middlewares/authMiddleware.js";

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

export default router;

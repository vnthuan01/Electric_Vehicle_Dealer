import express from "express";
import {
  getDealerDebts,
  listCustomerDebts,
  listManufacturerDebts,
  getDealerManufacturerDebtById,
  getCustomerDebtByOrder,
  getDealerManufacturerDebtByRequest,
} from "../controllers/debtController.js";
import {ROLE} from "../enum/roleEnum.js";
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
 *     summary: Get customer debts Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer debts retrieved successfully
 */
router.get("/customers", checkRole(ROLE.ADMIN), listCustomerDebts);

/**
 * @openapi
 * /api/debts/manufacturers:
 *   get:
 *     tags: [Debts]
 *     summary: Get dealer-manufacturer debts DEALER_MANAGER and EVM_STAFF only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dealer-Manufacturer debts retrieved successfully
 */
router.get(
  "/manufacturers",
  checkRole([ROLE.DEALER_MANAGER, ROLE.EVM_STAFF]),
  listManufacturerDebts
);

/**
 * @openapi
 * /api/debts/manufacturers/{id}:
 *   get:
 *     tags: [Debts]
 *     summary: Get a specific dealer-manufacturer debt by ID - DEALER_MANAGER and EVM_STAFF only
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
router.get(
  "/manufacturers/:id",
  checkRole([ROLE.DEALER_MANAGER, ROLE.EVM_STAFF]),
  getDealerManufacturerDebtById
);

/**
 * @openapi
 * /api/debts/manufacturers/request/{requestId}:
 *   get:
 *     tags: [Debts]
 *     summary: Get dealer-manufacturer debt by RequestVehicle (batch) - DEALER_MANAGER and EVM_STAFF only
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
  checkRole([ROLE.DEALER_MANAGER, ROLE.EVM_STAFF]),
  getDealerManufacturerDebtByRequest
);

/**
 * @openapi
 * /api/debts/customers-of-dealer:
 *   get:
 *     tags: [Debts]
 *     summary: Get debts of customers belonging to the logged-in dealer (DEALER_MANAGER only)
 *     description: >
 *       Retrieve a paginated list of customer debts associated with the current dealer.
 *       Supports filtering by debt `status` (e.g., `partial`, `settled`) and pagination.
 *       Admin users can optionally specify a `dealership_id` to view another dealer's debts.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         required: false
 *         description: >
 *           Filter debts by one or more statuses.
 *           Accepts comma-separated values such as `partial`, `settled`.
 *           Defaults to both if omitted.
 *         schema:
 *           type: string
 *           example: partial,settled
 *       - name: page
 *         in: query
 *         required: false
 *         description: Page number for pagination (default = 1)
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Number of records per page (default = 10)
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Dealer debts retrieved successfully
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
 *                   example: Dealer debts retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     totalItems:
 *                       type: integer
 *                       example: 25
 *                     filters:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["partial", "settled"]
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 6721a9f8bf91c3d1e7d5b4e2
 *                           total_amount:
 *                             type: number
 *                             example: 50000000
 *                           remaining_amount:
 *                             type: number
 *                             example: 10000000
 *                           status:
 *                             type: string
 *                             example: partial
 *                           order:
 *                             type: object
 *                             properties:
 *                               code:
 *                                 type: string
 *                                 example: ORD-20251101-0005
 *                               final_amount:
 *                                 type: number
 *                                 example: 50000000
 *                               status:
 *                                 type: string
 *                                 example: completed
 *                               paid_amount:
 *                                 type: number
 *                                 example: 40000000
 *                           customer:
 *                             type: object
 *                             properties:
 *                               full_name:
 *                                 type: string
 *                                 example: Nguyễn Văn A
 *                               phone:
 *                                 type: string
 *                                 example: 0901234567
 *                               email:
 *                                 type: string
 *                                 example: vana@example.com
 *       400:
 *         description: Missing dealership_id or invalid query
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Not a DEALER_MANAGER
 *       500:
 *         description: Internal server error
 */

router.get(
  "/customers-of-dealer",
  checkRole(ROLE.DEALER_MANAGER),
  getDealerDebts
);

/**
 * @openapi
 * /api/debts/customers/order/{orderId}:
 *   get:
 *     tags: [Debts]
 *     summary: Get customer debt by order - DEALER MANAGER only
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
router.get(
  "/customers/order/:orderId",
  checkRole(ROLE.DEALER_MANAGER),
  getCustomerDebtByOrder
);

export default router;

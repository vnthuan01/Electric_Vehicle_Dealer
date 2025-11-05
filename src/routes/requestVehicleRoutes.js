import express from "express";
import {
  requestVehicleFromManufacturer,
  approveRequest,
  rejectRequest,
  getAllRequests,
  deleteRequest,
  inProgressRequest,
  getRequestVehicleById,
  handleManufacturerDelivered,
  getAllRequestVehicleForDealer,
} from "../controllers/requestVehicleController.js";
import {ROLE} from "../enum/roleEnum.js";
import {checkRole} from "../middlewares/checkRole.js";
import {authenticate} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticate);
/**
 * @openapi
 * /api/request-vehicles/for-dealer:
 *   get:
 *     tags: [Dealer Requests]
 *     summary: Get all vehicle requests for the dealer (filterable by status, vehicle)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of requests for the logged-in dealer
 */
router.get(
  "/for-dealer",
  checkRole(ROLE.DEALER_MANAGER), // chỉ dealer mới truy cập
  getAllRequestVehicleForDealer
);

/**
 * @openapi
 * /api/request-vehicles:
 *   get:
 *     tags: [Dealer Requests]
 *     summary: Get all vehicle requests (filterable by status, dealership, vehicle)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: dealership_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of requests
 */
router.get("/", checkRole(ROLE.EVM_STAFF), getAllRequests);

/**
 * @openapi
 * /api/request-vehicles/{id}:
 *   get:
 *     tags: [Dealer Requests]
 *     summary: Get a specific vehicle request by ID
 *     description: Retrieve detailed information of a single vehicle request, including vehicle info, dealership, and status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the vehicle request
 *     responses:
 *       200:
 *         description: Successfully retrieved vehicle request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 vehicle_id:
 *                   type: string
 *                   description: ID of the requested vehicle
 *                 dealership_id:
 *                   type: string
 *                   description: ID of the dealership making the request
 *                 quantity:
 *                   type: number
 *                 color:
 *                   type: string
 *                 notes:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, approved, rejected, completed, canceled]
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Vehicle request not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  // checkRole(ROLE.EVM_STAFF, ROLE.DEALER_MANAGER, ROLE.DEALER_STAFF),
  getRequestVehicleById
);

/**
 * @openapi
 * /api/request-vehicles:
 *   post:
 *     tags: [Dealer Requests]
 *     summary: Dealer Manager creates a request to Manufacturer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicle_id
 *               - quantity
 *               - dealership_id
 *             properties:
 *               vehicle_id:
 *                 type: string
 *               quantity:
 *                 type: number
 *               color:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vehicle request created (pending approval)
 */
router.post(
  "/",
  checkRole(ROLE.DEALER_MANAGER),
  requestVehicleFromManufacturer
);

/**
 * @openapi
 * /api/request-vehicles/{id}/approve:
 *   patch:
 *     tags: [Dealer Requests]
 *     summary: Approve a pending vehicle request (EVM Staff)
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
 *         description: Request approved and stock/debt updated
 */
router.patch("/:id/approve", checkRole(ROLE.EVM_STAFF), approveRequest);

/**
 * @openapi
 * /api/request-vehicles/{id}/in-progress:
 *   patch:
 *     tags: [Dealer Requests]
 *     summary: In_progress a approved vehicle request (EVM Staff)
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
 *         description: Request in_progress
 */
router.patch("/:id/in-progress", checkRole(ROLE.EVM_STAFF), inProgressRequest);

/**
 * @openapi
 * /api/request-vehicles/{id}/reject:
 *   patch:
 *     tags: [Dealer Requests]
 *     summary: Reject a pending vehicle request (EVM Staff)
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *                 example: "Thông tin sai / hãng từ chối phân bổ xe"
 *     responses:
 *       200:
 *         description: Request rejected
 */
router.patch("/:id/reject", checkRole(ROLE.EVM_STAFF), rejectRequest);

// /**
//  * @openapi
//  * /api/request-vehicles/{id}/delivered:
//  *   patch:
//  *     tags: [Dealer Requests]
//  *     summary: Update delivery status and notes [EVM Staff]
//  *     description: ⚠️ Only for standalone RequestVehicles (no Order). If linked to Order, use /manufacturer-approve instead.
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               notes:
//  *                 type: string
//  *     responses:
//  *       200:
//  *         description: Request status updated
//  *       400:
//  *         description: RequestVehicle linked to Order (use /manufacturer-approve instead)
//  */
// router.patch(
//   "/:id/delivered",
//   checkRole(ROLE.EVM_STAFF),
//   updateRequestVehicleStatus
// );

/**
 * @openapi
 * /api/request-vehicles/{id}/delivered:
 *   patch:
 *     tags: [Dealer Requests]
 *     summary: Manufacturer approves vehicle request (transfers stock + creates debt)
 *     description: Handles both Order-linked and standalone RequestVehicles. Updates Order status if applicable.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: RequestVehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional delivery notes
 *     responses:
 *       200:
 *         description: Request approved, stock transferred, debt created
 *       400:
 *         description: Invalid request or insufficient stock
 */
router.patch(
  "/:id/delivered",
  checkRole(ROLE.EVM_STAFF),
  handleManufacturerDelivered
);

// /**
//  * @openapi
//  * /api/request-vehicles/{id}/manufacturer-reject:
//  *   patch:
//  *     tags: [Dealer Requests]
//  *     summary: Manufacturer rejects vehicle request
//  *     description: Rejects RequestVehicle. If linked to Order, cancels Order and refunds customer.
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: RequestVehicle ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - reason
//  *             properties:
//  *               reason:
//  *                 type: string
//  *                 description: Reason for rejection
//  *     responses:
//  *       200:
//  *         description: Request rejected (Order canceled and refunded if applicable)
//  *       400:
//  *         description: Invalid request
//  */
// router.patch(
//   "/:id/manufacturer-reject",
//   checkRole(ROLE.EVM_STAFF),
//   handleManufacturerReject
// );

/**
 * @openapi
 * /api/request-vehicles/{id}:
 *   delete:
 *     tags: [Dealer Requests]
 *     summary: Delete a pending request (Manager only)
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
 *         description: Request deleted
 */
router.delete("/:id", checkRole(ROLE.DEALER_MANAGER), deleteRequest);

export default router;

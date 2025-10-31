import express from "express";
import {
  requestVehicleFromManufacturer,
  approveRequest,
  rejectRequest,
  getAllRequests,
  deleteRequest,
  updateRequestVehicleStatus,
  inProgressRequest,
  handleManufacturerApprove,
  handleManufacturerReject,
  getRequestVehicleById,
} from "../controllers/requestVehicleController.js";
import { ROLE } from "../enum/roleEnum.js";
import { checkRole } from "../middlewares/checkRole.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/:id",
//   checkRole(ROLE.EVM_STAFF, ROLE.DEALER_MANAGER, ROLE.DEALER_STAFF),
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
router.get(
  "/",
  checkRole([ROLE.DEALER_MANAGER, ROLE.EVM_STAFF, ROLE.ADMIN]),
  getAllRequests
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
router.patch(
  "/:id/in-progress",
  checkRole([ROLE.EVM_STAFF]),
  inProgressRequest
);

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
 *     responses:
 *       200:
 *         description: Request rejected
 */
router.patch("/:id/reject", checkRole([ROLE.EVM_STAFF]), rejectRequest);

/**
 * @openapi
 * /api/request-vehicles/{id}/delivered:
 *   patch:
 *     tags: [Dealer Requests]
 *     summary: Update delivery status and notes [EVM Staff]
 *     description: ⚠️ Only for standalone RequestVehicles (no Order). If linked to Order, use /manufacturer-approve instead.
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
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request status updated
 *       400:
 *         description: RequestVehicle linked to Order (use /manufacturer-approve instead)
 */
router.patch(
  "/:id/delivered",
  checkRole(ROLE.EVM_STAFF),
  updateRequestVehicleStatus
);

/**
 * @openapi
 * /api/request-vehicles/{id}/manufacturer-approve:
 *   post:
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
router.post(
  "/:id/manufacturer-approve",
  checkRole(ROLE.EVM_STAFF),
  handleManufacturerApprove
);

/**
 * @openapi
 * /api/request-vehicles/{id}/manufacturer-reject:
 *   post:
 *     tags: [Dealer Requests]
 *     summary: Manufacturer rejects vehicle request
 *     description: Rejects RequestVehicle. If linked to Order, cancels Order and refunds customer.
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
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Request rejected (Order cancelled and refunded if applicable)
 *       400:
 *         description: Invalid request
 */
router.post(
  "/:id/manufacturer-reject",
  checkRole(ROLE.EVM_STAFF),
  handleManufacturerReject
);

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

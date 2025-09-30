import express from "express";
import {
  requestVehicleFromManufacturer,
  approveRequest,
  rejectRequest,
  getAllRequests,
  deleteRequest,
} from "../controllers/requestVehicleController.js";
import {ROLE} from "../enum/roleEnum.js";
import {checkRole} from "../middlewares/checkRole.js";
import {authenticate} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

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
 *               dealership_id:
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
 *     summary: Approve a pending vehicle request (EVM Staff/Admin only)
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
router.patch(
  "/:id/approve",
  checkRole([ROLE.EVM_STAFF, ROLE.ADMIN]),
  approveRequest
);

/**
 * @openapi
 * /api/request-vehicles/{id}/reject:
 *   patch:
 *     tags: [Dealer Requests]
 *     summary: Reject a pending vehicle request (EVM Staff/Admin only)
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
router.patch(
  "/:id/reject",
  checkRole([ROLE.EVM_STAFF, ROLE.ADMIN]),
  rejectRequest
);

/**
 * @openapi
 * /api/request-vehicles/{id}:
 *   delete:
 *     tags: [Dealer Requests]
 *     summary: Delete a pending request (Admin only)
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

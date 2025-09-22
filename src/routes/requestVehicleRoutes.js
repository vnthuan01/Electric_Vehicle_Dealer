import express from "express";
import {requestVehicleFromManufacturer} from "../controllers/requestVehicleController.js";
import {ROLE} from "../enum/roleEnum.js";
import {checkRole} from "../middlewares/checkRole.js";

const router = express.Router();

/**
 * @openapi
 * /api/vehicle-request:
 *   post:
 *     tags: [Dealer Requests]
 *     summary: Dealer Manager requests vehicles from Manufacturer
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
 *                 description: Vehicle ObjectId to request
 *               quantity:
 *                 type: number
 *                 description: Number of vehicles requested
 *               dealership_id:
 *                 type: string
 *                 description: Dealer ObjectId making the request
 *     responses:
 *       201:
 *         description: Vehicle request created successfully and Dealer-Manufacturer debt updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     vehicle:
 *                       $ref: '#/components/schemas/Vehicle'
 *                     quantity:
 *                       type: number
 *                     debt:
 *                       $ref: '#/components/schemas/DealerManufacturerDebt'
 *       400:
 *         description: Missing required fields or insufficient stock
 *       404:
 *         description: Vehicle not found
 */
router.post(
  "/",
  checkRole(ROLE.DEALER_MANAGER),
  requestVehicleFromManufacturer
);

export default router;

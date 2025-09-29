import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {EVM_ADMIN_ROLES} from "../enum/roleEnum.js";
import {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  compareCars,
} from "../controllers/vehicleController.js";
import {uploadVehicleImage} from "../utils/fileUpload.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Vehicles
 *     description: Manage vehicle catalog
 *   - name: Compare
 *     description: Compare vehicles
 */

/**
 * @openapi
 * /api/vehicles:
 *   get:
 *     tags: [Vehicles]
 *     summary: List vehicles with filters and pagination
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [car, motorbike] }
 *       - in: query
 *         name: manufacturer_id
 *         schema: { type: string }
 *       - in: query
 *         name: price[min]
 *         schema: { type: number }
 *       - in: query
 *         name: price[max]
 *         schema: { type: number }
 *       - in: query
 *         name: range_km[min]
 *         schema: { type: number }
 *       - in: query
 *         name: range_km[max]
 *         schema: { type: number }
 *       - in: query
 *         name: battery_type
 *         schema: { type: string, enum: [LFP, NMC, other] }
 *       - in: query
 *         name: color_options
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "price:asc,createdAt:desc" }
 *     responses:
 *       200:
 *         description: Vehicle list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VehicleFull'
 *                 total: { type: integer }
 */
router.get("/", getVehicles);

/**
 * @openapi
 * /api/vehicles/{id}:
 *   get:
 *     tags: [Vehicles]
 *     summary: Get vehicle by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vehicle detail retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleFull'
 *       404:
 *         description: Vehicle not found
 */
router.get("/:id", getVehicleById);

/**
 * @openapi
 * /api/vehicles/compare/{id1}/{id2}:
 *   get:
 *     tags: [Compare]
 *     summary: Compare two vehicles by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id1
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id2
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Comparison result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicle1: { $ref: '#/components/schemas/VehicleFull' }
 *                 vehicle2: { $ref: '#/components/schemas/VehicleFull' }
 *       404:
 *         description: One or both vehicles not found
 */
router.get("/compare/:id1/:id2", compareCars);

/**
 * @openapi
 * /api/vehicles:
 *   post:
 *     tags: [Vehicles]
 *     summary: Create one or multiple vehicles with images
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/VehicleInputFull'
 *     responses:
 *       201:
 *         description: Vehicle(s) created successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  "/",
  uploadVehicleImage.array("images", 10),
  checkRole(EVM_ADMIN_ROLES),
  createVehicle
);

/**
 * @openapi
 * /api/vehicles/{id}:
 *   put:
 *     tags: [Vehicles]
 *     summary: Update vehicle details and manage images
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/VehicleInputFull'
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       404:
 *         description: Vehicle not found
 */
router.put(
  "/:id",
  uploadVehicleImage.array("images", 10),
  checkRole(EVM_ADMIN_ROLES),
  updateVehicle
);

/**
 * @openapi
 * /api/vehicles/{id}:
 *   delete:
 *     tags: [Vehicles]
 *     summary: Soft delete vehicle (set inactive)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vehicle soft deleted successfully }
 *       404: { description: Vehicle not found }
 */
router.delete("/:id", checkRole(EVM_ADMIN_ROLES), deleteVehicle);

/**
 * @openapi
 * components:
 *   schemas:
 *     VehicleFull:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         model: { type: string }
 *         category: { type: string, enum: [car, motorbike] }
 *         manufacturer_id: { type: string }
 *         sku: { type: string }
 *         version: { type: string }
 *         release_status: { type: string, enum: [coming_soon, available, discontinued] }
 *         release_date: { type: string, format: date }
 *         status: { type: string, enum: [active, inactive] }
 *         price: { type: number }
 *         on_road_price: { type: number }
 *         battery_type: { type: string, enum: [LFP, NMC, other] }
 *         battery_capacity: { type: number }
 *         range_km: { type: number }
 *         wltp_range_km: { type: number }
 *         charging_fast: { type: number }
 *         charging_slow: { type: number }
 *         charging_port_type: { type: string, enum: [CCS2, Type2, CHAdeMO, Tesla, Other] }
 *         motor_power: { type: number }
 *         top_speed: { type: number }
 *         acceleration: { type: number }
 *         drivetrain: { type: string, enum: [FWD, RWD, AWD] }
 *         dimensions:
 *           type: object
 *           properties:
 *             length: { type: number }
 *             width: { type: number }
 *             height: { type: number }
 *             wheelbase: { type: number }
 *             ground_clearance: { type: number }
 *         weight: { type: number }
 *         payload: { type: number }
 *         seating_capacity: { type: number }
 *         tire_size: { type: string }
 *         trunk_type: { type: string, enum: [manual, electric, auto] }
 *         safety_features:
 *           type: array
 *           items: { type: string }
 *         interior_features:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *         driving_modes:
 *           type: array
 *           items: { type: string }
 *         software_version: { type: string }
 *         ota_update: { type: boolean }
 *         stock:
 *             type: number
 *             example: 50
 *         warranty_years: { type: number }
 *         battery_warranty_years: { type: number }
 *         color_options:
 *           type: array
 *           items: { type: string }
 *         images:
 *           type: array
 *           items: { type: string }
 *         description: { type: string }
 *         promotions:
 *           type: array
 *           items: { type: string }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     VehicleInputFull:
 *       type: object
 *       properties:
 *         name: { type: string }
 *         model: { type: string }
 *         category: { type: string, enum: [car, motorbike] }
 *         manufacturer_id: { type: string }
 *         sku: { type: string }
 *         version: { type: string }
 *         release_status: { type: string, enum: [coming_soon, available, discontinued] }
 *         release_date: { type: string, format: date }
 *         status: { type: string, enum: [active, inactive] }
 *         price: { type: number }
 *         on_road_price: { type: number }
 *         battery_type: { type: string }
 *         battery_capacity: { type: number }
 *         range_km: { type: number }
 *         wltp_range_km: { type: number }
 *         charging_fast: { type: number }
 *         charging_slow: { type: number }
 *         charging_port_type: { type: string }
 *         motor_power: { type: number }
 *         top_speed: { type: number }
 *         acceleration: { type: number }
 *         drivetrain: { type: string }
 *         dimensions:
 *           type: object
 *           properties:
 *             length: { type: number }
 *             width: { type: number }
 *             height: { type: number }
 *             wheelbase: { type: number }
 *             ground_clearance: { type: number }
 *         weight: { type: number }
 *         payload: { type: number }
 *         seating_capacity: { type: number }
 *         tire_size: { type: string }
 *         trunk_type: { type: string }
 *         safety_features:
 *           type: array
 *           items: { type: string }
 *         interior_features:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *         driving_modes:
 *           type: array
 *           items: { type: string }
 *         software_version: { type: string }
 *         ota_update: { type: boolean }
 *         stocks:
 *           type: number
 *         warranty_years: { type: number }
 *         battery_warranty_years: { type: number }
 *         color_options:
 *           type: array
 *           items: { type: string }
 *         images:
 *           type: array
 *           items: { type: string, format: binary }
 *         description: { type: string }
 *         promotions:
 *           type: array
 *           items: { type: string }
 */
export default router;

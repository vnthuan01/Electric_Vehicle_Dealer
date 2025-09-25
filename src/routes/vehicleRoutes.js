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
 */

/**
 * @openapi
 * /api/vehicles:
 *   get:
 *     tags: [Vehicles]
 *     summary: List vehicles with filters and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by name, model, or version
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by vehicle status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [car, motorbike]
 *         description: Vehicle type
 *       - in: query
 *         name: manufacturer_id
 *         schema:
 *           type: string
 *         description: Filter by manufacturer ID
 *       - in: query
 *         name: price[min]
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: price[max]
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: range_km[min]
 *         schema:
 *           type: number
 *         description: Minimum range (km)
 *       - in: query
 *         name: range_km[max]
 *         schema:
 *           type: number
 *         description: Maximum range (km)
 *       - in: query
 *         name: battery_type
 *         schema:
 *           type: string
 *           enum: [LFP, NMC, other]
 *         description: Battery type
 *       - in: query
 *         name: color_options
 *         schema:
 *           type: string
 *         description: Filter by available color
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: "price:asc,createdAt:desc"
 *         description: Sort fields (e.g., price:asc,createdAt:desc)
 *     responses:
 *       200:
 *         description: Vehicle list retrieved successfully
 */
router.get("/", getVehicles);

/**
 * @openapi
 * /api/vehicles/{id}:
 *   get:
 *     tags: [Vehicles]
 *     summary: Get vehicle by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vehicle detail retrieved successfully }
 *       404: { description: Vehicle not found }
 */
router.get("/:id", getVehicleById);
/**
 * @openapi
 * /api/vehicles:
 *   post:
 *     tags: [Vehicles]
 *     summary: Create one or multiple vehicles with images
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *                 description: Unique SKU for each vehicle
 *               name:
 *                 type: string
 *                 description: Vehicle model name
 *               category:
 *                 type: string
 *                 enum: [car, motorbike]
 *                 description: Vehicle type
 *               manufacturer_id:
 *                 type: string
 *               price:
 *                 type: number
 *               version:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               on_road_price:
 *                 type: number
 *               battery_type:
 *                 type: string
 *                 enum: [LFP, NMC, other]
 *               battery_capacity:
 *                 type: number
 *               range_km:
 *                 type: number
 *               charging_fast:
 *                 type: number
 *               charging_slow:
 *                 type: number
 *               motor_power:
 *                 type: number
 *               top_speed:
 *                 type: number
 *               acceleration:
 *                 type: number
 *               dimensions:
 *                 type: object
 *                 properties:
 *                   length: { type: number }
 *                   width: { type: number }
 *                   height: { type: number }
 *                   wheelbase: { type: number }
 *                   ground_clearance: { type: number }
 *               weight: { type: number }
 *               payload: { type: number }
 *               safety_features:
 *                 type: array
 *                 items: { type: string }
 *               interior_features:
 *                 type: array
 *                 items: { type: object }
 *               driving_modes:
 *                 type: array
 *                 items: { type: string }
 *               software_version: { type: string }
 *               ota_update: { type: boolean }
 *               stock: { type: number }
 *               warranty_years: { type: number }
 *               color_options:
 *                 type: array
 *                 items: { type: string }
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Upload multiple images
 *               description: { type: string }
 *               options:
 *                 type: array
 *                 items: { type: string }
 *               accessories:
 *                 type: array
 *                 items: { type: string }
 *               promotions:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Vehicle(s) created successfully
 *       400:
 *         description: Invalid request or no valid vehicles to create
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [car, motorbike]
 *               manufacturer_id:
 *                 type: string
 *               price:
 *                 type: number
 *               version:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               on_road_price:
 *                 type: number
 *               battery_type:
 *                 type: string
 *                 enum: [LFP, NMC, other]
 *               battery_capacity:
 *                 type: number
 *               range_km:
 *                 type: number
 *               charging_fast:
 *                 type: number
 *               charging_slow:
 *                 type: number
 *               motor_power:
 *                 type: number
 *               top_speed:
 *                 type: number
 *               acceleration:
 *                 type: number
 *               dimensions:
 *                 type: object
 *                 properties:
 *                   length: { type: number }
 *                   width: { type: number }
 *                   height: { type: number }
 *                   wheelbase: { type: number }
 *                   ground_clearance: { type: number }
 *               weight: { type: number }
 *               payload: { type: number }
 *               safety_features:
 *                 type: array
 *                 items: { type: string }
 *               interior_features:
 *                 type: array
 *                 items: { type: object }
 *               driving_modes:
 *                 type: array
 *                 items: { type: string }
 *               software_version: { type: string }
 *               ota_update: { type: boolean }
 *               stock: { type: number }
 *               warranty_years: { type: number }
 *               color_options:
 *                 type: array
 *                 items: { type: string }
 *               description: { type: string }
 *               options:
 *                 type: array
 *                 items: { type: string }
 *               accessories:
 *                 type: array
 *                 items: { type: string }
 *               promotions:
 *                 type: array
 *                 items: { type: string }
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Upload new images
 *               imagesToRemove:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of existing image URLs to delete
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
 *     summary: Delete vehicle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vehicle deleted successfully }
 *       404: { description: Vehicle not found }
 */
router.delete("/:id", checkRole(EVM_ADMIN_ROLES), deleteVehicle);

/**
 * @openapi
 * /api/vehicles/compare/{id1}/{id2}:
 *   get:
 *     tags: [Compare]
 *     summary: Compare two cars by ID
 *     security:
 *       - bearerAuth: []
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
 *       404:
 *         description: One or both cars not found
 */
router.get("/compare/:id1/:id2", compareCars);

export default router;

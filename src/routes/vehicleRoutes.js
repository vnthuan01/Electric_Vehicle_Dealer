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
 *     summary: Create one or multiple vehicles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [sku, name, category, price, manufacturer_id]
 *                 properties:
 *                   sku: { type: string, description: "Unique SKU for each vehicle configuration" }
 *                   name: { type: string, description: "Vehicle model name (e.g., VF3)" }
 *                   category: { type: string, enum: [car, motorbike], description: "Vehicle type" }
 *                   manufacturer_id: { type: string, description: "Reference to manufacturer" }
 *                   version: { type: string, description: "Version / trim (Eco, Plus, Pro)" }
 *                   status: { type: string, enum: [active, inactive], description: "Availability status" }
 *                   price: { type: number, description: "Official price" }
 *                   on_road_price: { type: number, description: "Estimated on-road price (including fees)" }
 *                   battery_type: { type: string, enum: [LFP, NMC, other], description: "Battery chemistry" }
 *                   battery_capacity: { type: number, description: "Battery capacity in kWh" }
 *                   range_km: { type: number, description: "Maximum range in km per full charge" }
 *                   charging_fast: { type: number, description: "Fast charging time 10%-70% in minutes" }
 *                   charging_slow: { type: number, description: "Slow/home charging time in hours" }
 *                   motor_power: { type: number, description: "Motor power in kW" }
 *                   top_speed: { type: number, description: "Top speed in km/h" }
 *                   acceleration: { type: number, description: "0-100 km/h time in seconds" }
 *                   dimensions:
 *                     type: object
 *                     properties:
 *                       length: { type: number, description: "Length in mm" }
 *                       width: { type: number, description: "Width in mm" }
 *                       height: { type: number, description: "Height in mm" }
 *                       wheelbase: { type: number, description: "Wheelbase in mm" }
 *                       ground_clearance: { type: number, description: "Ground clearance in mm" }
 *                   weight: { type: number, description: "Vehicle weight in kg" }
 *                   payload: { type: number, description: "Maximum payload in kg" }
 *                   safety_features: { type: array, items: { type: string }, description: "Safety features (ABS, airbags, radar...)" }
 *                   interior_features: { type: array, items: { type: string }, description: "Interior equipment (seats, display, AC...)" }
 *                   driving_modes: { type: array, items: { type: string }, description: "Driving modes (Eco, Sport, Normal)" }
 *                   software_version: { type: string, description: "Current software version" }
 *                   ota_update: { type: boolean, description: "Supports OTA/FOTA updates" }
 *                   stock: { type: number, description: "Available stock quantity" }
 *                   warranty_years: { type: number, description: "Warranty period in years" }
 *                   color_options: { type: array, items: { type: string } }
 *                   images: { type: array, items: { type: string } }
 *                   description: { type: string }
 *                   options: { type: array, items: { type: string }, description: "Option IDs" }
 *                   accessories: { type: array, items: { type: string }, description: "Accessory IDs" }
 *                   promotions: { type: array, items: { type: string }, description: "Promotion IDs" }
 *               - type: array
 *                 items:
 *                   $ref: '#/components/schemas/Vehicle'
 *     responses:
 *       201: { description: Vehicle(s) created successfully }
 *       400: { description: Invalid request or no valid vehicles to create }
 */
router.post("/", checkRole(EVM_ADMIN_ROLES), createVehicle);

/**
 * @openapi
 * /api/vehicles/{id}:
 *   put:
 *     tags: [Vehicles]
 *     summary: Update vehicle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: All fields are optional, price change will update price_history
 */
router.put("/:id", checkRole(EVM_ADMIN_ROLES), updateVehicle);

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

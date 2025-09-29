import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {EVM_ADMIN_ROLES} from "../enum/roleEnum.js";
import {
  createDealership,
  getDealerships,
  getDealershipById,
  updateDealership,
  deactivateDealership,
} from "../controllers/dealershipController.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Dealerships
 *     description: Manage dealerships (EVM Staff only)
 */

// Middleware: bắt buộc đăng nhập + role EVM Staff
router.use(authenticate, checkRole(EVM_ADMIN_ROLES));

/**
 * @openapi
 * /api/dealerships:
 *   post:
 *     tags: [Dealerships]
 *     summary: Create/Register dealership
 *     description: Manufacturer staff tạo mới một đại lý. `manufacturer_id` sẽ được lấy từ user đăng nhập, không cần truyền trong body.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *           example:
 *             name: "EV Dealer HCMC"
 *             code: "DLHCM001"
 *             address: "123 Nguyen Hue, District 1, HCMC"
 *             phone: "02812345678"
 *             email: "contact@evdealerhcmc.com"
 *     responses:
 *       201: { description: Created }
 */
router.post("/", createDealership);

/**
 * @openapi
 * /api/dealerships:
 *   get:
 *     tags: [Dealerships]
 *     summary: List dealerships
 *     description: Lọc theo `q` (tìm tên hoặc code), `isActive`, `manufacturer_id` (chỉ EVM Staff mới xem được).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name or code
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *         description: Filter by active status
 *     responses:
 *       200: { description: OK }
 */
router.get("/", getDealerships);

/**
 * @openapi
 * /api/dealerships/{id}:
 *   get:
 *     tags: [Dealerships]
 *     summary: Get dealership by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not Found }
 */
router.get("/:id", getDealershipById);

/**
 * @openapi
 * /api/dealerships/{id}:
 *   put:
 *     tags: [Dealerships]
 *     summary: Update dealership (legal + operational info)
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
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not Found }
 */
router.put("/:id", updateDealership);

/**
 * @openapi
 * /api/dealerships/{id}/deactivate:
 *   patch:
 *     tags: [Dealerships]
 *     summary: Deactivate dealership (mark as inactive)
 *     description: Đánh dấu ngừng hợp tác (set `isActive = false`).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not Found }
 */
router.patch("/:id/deactivate", deactivateDealership);

export default router;

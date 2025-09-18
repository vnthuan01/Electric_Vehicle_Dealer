import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {EVM_ADMIN_ROLES} from "../enum/roleEnum.js";
import {
  createDealership,
  getDealerships,
  getDealershipById,
  updateDealership,
  deleteDealership,
} from "../controllers/dealershipController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Dealerships
 *     description: Manage dealerships
 */

/**
 * @openapi
 * /api/dealerships:
 *   get:
 *     tags: [Dealerships]
 *     summary: List dealerships
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
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
 * /api/dealerships:
 *   post:
 *     tags: [Dealerships]
 *     summary: Create dealership
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
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *           example:
 *             name: "EV Dealer HCMC"
 *             code: "DLHCM001"
 *             address: "123 Nguyen Hue, District 1, HCMC"
 *             phone: "02812345678"
 *             email: "contact@evdealerhcmc.com"
 *     responses:
 *       201: { description: Created }
 */
router.post("/", checkRole(EVM_ADMIN_ROLES), createDealership);

/**
 * @openapi
 * /api/dealerships/{id}:
 *   put:
 *     tags: [Dealerships]
 *     summary: Update dealership
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
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *           example:
 *             name: "EV Dealer Hanoi"
 *             code: "DLHN002"
 *             address: "456 Ly Thuong Kiet, Hoan Kiem, Hanoi"
 *             phone: "02498765432"
 *             email: "support@evdealerhn.com"
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not Found }
 */
router.put("/:id", checkRole(EVM_ADMIN_ROLES), updateDealership);

/**
 * @openapi
 * /api/dealerships/{id}:
 *   delete:
 *     tags: [Dealerships]
 *     summary: Delete dealership
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
router.delete("/:id", checkRole(EVM_ADMIN_ROLES), deleteDealership);

export default router;

import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {EVM_ADMIN_ROLES} from "../enum/roleEnum.js";
import {
  createManufacturer,
  getManufacturers,
  getManufacturerById,
  updateManufacturer,
  deleteManufacturer,
} from "../controllers/manufacturerController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Manufacturers
 *     description: Manage manufacturers
 */

/**
 * @openapi
 * /api/manufacturers:
 *   get:
 *     tags: [Manufacturers]
 *     summary: List manufacturers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get("/", getManufacturers);

/**
 * @openapi
 * /api/manufacturers/{id}:
 *   get:
 *     tags: [Manufacturers]
 *     summary: Get manufacturer by id
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
router.get("/:id", getManufacturerById);

/**
 * @openapi
 * /api/manufacturers:
 *   post:
 *     tags: [Manufacturers]
 *     summary: Create manufacturer
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
 *               country:
 *                 type: string
 *               founded:
 *                 type: integer
 *           example:
 *             name: "Tesla Inc."
 *             code: "TSLA"
 *             country: "USA"
 *             founded: 2003
 *     responses:
 *       201: { description: Created }
 */
router.post("/", checkRole(EVM_ADMIN_ROLES), createManufacturer);

/**
 * @openapi
 * /api/manufacturers/{id}:
 *   put:
 *     tags: [Manufacturers]
 *     summary: Update manufacturer
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
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               country:
 *                 type: string
 *               founded:
 *                 type: integer
 *           example:
 *             name: "VinFast"
 *             code: "VF"
 *             country: "Vietnam"
 *             founded: 2017
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not Found }
 */
router.put("/:id", checkRole(EVM_ADMIN_ROLES), updateManufacturer);

/**
 * @openapi
 * /api/manufacturers/{id}:
 *   delete:
 *     tags: [Manufacturers]
 *     summary: Delete manufacturer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not Found }
 */
router.delete("/:id", checkRole(EVM_ADMIN_ROLES), deleteManufacturer);

export default router;

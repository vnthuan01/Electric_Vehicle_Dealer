import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {EVM_ADMIN_ROLES} from "../enum/roleEnum.js";
import {
  createAccessory,
  getAccessories,
  getAccessoryById,
  updateAccessory,
  deleteAccessory,
} from "../controllers/accessoryController.js";
import {uploadAccessoryImage} from "../utils/fileUpload.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Accessories
 *     description: Manage accessories
 */

/**
 * @openapi
 * /api/accessories:
 *   get:
 *     tags: [Accessories]
 *     summary: List accessories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get("/", getAccessories);

/**
 * @openapi
 * /api/accessories/{id}:
 *   get:
 *     tags: [Accessories]
 *     summary: Get accessory by id
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
router.get("/:id", getAccessoryById);

/**
 * @openapi
 * /api/accessories:
 *   post:
 *     tags: [Accessories]
 *     summary: Create accessory (supports multiple images)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               type: { type: string }
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201: { description: Created }
 */
router.post(
  "/",
  checkRole(EVM_ADMIN_ROLES),
  uploadAccessoryImage.array("images", 10),
  createAccessory
);

/**
 * @openapi
 * /api/accessories/{id}:
 *   put:
 *     tags: [Accessories]
 *     summary: Update accessory, add/remove images
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               type: { type: string }
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               imagesToRemove:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not Found }
 */
router.put(
  "/:id",
  checkRole(EVM_ADMIN_ROLES),
  uploadAccessoryImage.array("images", 10),
  updateAccessory
);

/**
 * @openapi
 * /api/accessories/{id}:
 *   delete:
 *     tags: [Accessories]
 *     summary: Delete accessory
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
router.delete("/:id", checkRole(EVM_ADMIN_ROLES), deleteAccessory);

export default router;

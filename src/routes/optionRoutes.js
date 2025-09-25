import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {EVM_ADMIN_ROLES} from "../enum/roleEnum.js";
import {
  createOption,
  getOptions,
  getOptionById,
  updateOption,
  deleteOption,
} from "../controllers/optionController.js";
import {uploadOptionImage} from "../utils/fileUpload.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Options
 *     description: Manage options
 */

/**
 * @openapi
 * /api/options:
 *   get:
 *     tags: [Options]
 *     summary: List options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get("/", getOptions);

/**
 * @openapi
 * /api/options/{id}:
 *   get:
 *     tags: [Options]
 *     summary: Get option by id
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
router.get("/:id", getOptionById);

/**
 * @openapi
 * /api/options:
 *   post:
 *     tags: [Options]
 *     summary: Create option (supports multiple images)
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
 *               category: { type: string }
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
  uploadOptionImage.array("images", 10),
  createOption
);

/**
 * @openapi
 * /api/options/{id}:
 *   put:
 *     tags: [Options]
 *     summary: Update option, add/remove images
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
 *               category: { type: string }
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
  uploadOptionImage.array("images", 10),
  updateOption
);

/**
 * @openapi
 * /api/options/{id}:
 *   delete:
 *     tags: [Options]
 *     summary: Delete option
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
router.delete("/:id", checkRole(EVM_ADMIN_ROLES), deleteOption);

export default router;

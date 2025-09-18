import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {EVM_ADMIN_ROLES} from "../enum/roleEnum.js";
import {
  createPromotion,
  getPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
} from "../controllers/promotionController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Promotions
 *     description: Manage promotions
 */

/**
 * @openapi
 * /api/promotions:
 *   get:
 *     tags: [Promotions]
 *     summary: List promotions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: OK }
 */
router.get("/", getPromotions);

/**
 * @openapi
 * /api/promotions/{id}:
 *   get:
 *     tags: [Promotions]
 *     summary: Get promotion by id
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
router.get("/:id", getPromotionById);

/**
 * @openapi
 * /api/promotions:
 *   post:
 *     tags: [Promotions]
 *     summary: Create promotion
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, value]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [percent, amount]
 *               value:
 *                 type: number
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               is_active:
 *                 type: boolean
 *           example:
 *             name: "Giảm giá mùa lễ hội"
 *             type: "percent"
 *             value: 15
 *             start_date: "2025-09-20T00:00:00.000Z"
 *             end_date: "2025-10-10T23:59:59.000Z"
 *             is_active: true
 *     responses:
 *       201: { description: Created }
 */
router.post("/", checkRole(EVM_ADMIN_ROLES), createPromotion);

/**
 * @openapi
 * /api/promotions/{id}:
 *   put:
 *     tags: [Promotions]
 *     summary: Update promotion
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
 *           example:
 *             name: "Khuyến mãi đặc biệt tháng 10"
 *             type: "amount"
 *             value: 2000000
 *             start_date: "2025-10-01T00:00:00.000Z"
 *             end_date: "2025-10-31T23:59:59.000Z"
 *             is_active: false
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not Found }
 */
router.put("/:id", checkRole(EVM_ADMIN_ROLES), updatePromotion);

/**
 * @openapi
 * /api/promotions/{id}:
 *   delete:
 *     tags: [Promotions]
 *     summary: Delete promotion
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
router.delete("/:id", checkRole(EVM_ADMIN_ROLES), deletePromotion);

export default router;

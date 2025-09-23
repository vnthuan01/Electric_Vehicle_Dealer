import express from "express";
import {
  createFeedback,
  getFeedbacks,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
} from "../controllers/feedbackController.js";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {DEALER_ROLES, ROLE} from "../enum/roleEnum.js";

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /api/feedbacks:
 *   get:
 *     tags: [Feedbacks]
 *     summary: Get all feedbacks (Staff/Manager/Admin only, with pagination & search)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: createdAt:desc
 *     responses:
 *       200:
 *         description: List of feedbacks
 */
router.get(
  "/",
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER, ROLE.ADMIN]),
  getFeedbacks
);

/**
 * @openapi
 * /api/feedbacks/{id}:
 *   get:
 *     tags: [Feedbacks]
 *     summary: Get feedback by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feedback detail
 */
router.get(
  "/:id",
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER, ROLE.ADMIN]),
  getFeedbackById
);

/**
 * @openapi
 * /api/feedbacks:
 *   post:
 *     tags: [Feedbacks]
 *     summary: Create feedback (Customer required, handled by Staff/Admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - content
 *               - handler_id
 *             properties:
 *               customer_id:
 *                 type: string
 *               order_id:
 *                 type: string
 *               content:
 *                 type: string
 *               handler_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Feedback created
 */
router.post("/", createFeedback);

/**
 * @openapi
 * /api/feedbacks/{id}:
 *   put:
 *     tags: [Feedbacks]
 *     summary: Update feedback (Dealer Staff/Manager only)
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
 *               content:
 *                 type: string
 *               handler_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feedback updated
 */
router.put(
  "/:id",
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER]),
  updateFeedback
);

/**
 * @openapi
 * /api/feedbacks/{id}:
 *   delete:
 *     tags: [Feedbacks]
 *     summary: Delete feedback (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feedback deleted
 */
router.delete("/:id", checkRole([ROLE.ADMIN, DEALER_ROLES]), deleteFeedback);

export default router;

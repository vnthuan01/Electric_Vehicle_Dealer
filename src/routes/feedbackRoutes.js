import express from "express";
import {
  createFeedback,
  getFeedbacks,
  updateFeedbackStatus,
  addFeedbackComment,
} from "../controllers/feedbackController.js";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {ROLE} from "../enum/roleEnum.js";

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /api/feedbacks:
 *   get:
 *     tags: [Feedbacks]
 *     summary: Get all complaints (Dealer roles only, with pagination & search)
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
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER]),
  getFeedbacks
);

/**
 * @openapi
// Removed GET by id – not required for simplified flow

/**
 * @openapi
 * /api/feedbacks:
 *   post:
 *     tags: [Feedbacks]
 *     summary: Create complaint (Dealer roles)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customer_id, content]
 *             properties:
 *               customer_id:
 *                 type: string
 *               content: { type: string }
 *     responses:
 *       201:
 *         description: Feedback created
 */
router.post(
  "/",
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER]),
  createFeedback
);

/**
 * @openapi
// Removed general update – only status and comments allowed

/**
 * @openapi
// Removed delete – not required for simplified flow

/**
 * @openapi
 * /api/feedbacks/{id}/status:
 *   patch:
 *     tags: [Feedbacks]
 *     summary: Update complaint status (Dealer roles)
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, in_progress, resolved, rejected]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  "/:id/status",
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER]),
  updateFeedbackStatus
);

/**
 * @openapi
 * /api/feedbacks/{id}/comments:
 *   post:
 *     tags: [Feedbacks]
 *     summary: Add a processing comment (Dealer roles)
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
 *             required: [comment, user_id]
 *             properties:
 *               comment: { type: string }
 *               user_id: { type: string }
 *     responses:
 *       200:
 *         description: Comment added
 */
router.post(
  "/:id/comments",
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER]),
  addFeedbackComment
);

export default router;

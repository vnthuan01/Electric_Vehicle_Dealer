import express from "express";
import {
  createFeedback,
  getFeedbacks,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
} from "../controllers/feedbackController.js";
import {checkRole} from "../middlewares/checkRole.js";
import {authenticate} from "../middlewares/authMiddleware.js";
import {DEALER_ROLES} from "../enum/roleEnum.js";

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Feedbacks
 *     description: Manage customer feedbacks and complaints
 */

/**
 * @openapi
 * /api/feedbacks:
 *   get:
 *     tags: [Feedbacks]
 *     summary: List feedbacks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Feedback list retrieved successfully }
 */
router.get("/", getFeedbacks);

/**
 * @openapi
 * /api/feedbacks/{id}:
 *   get:
 *     tags: [Feedbacks]
 *     summary: Get feedback by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Feedback detail retrieved successfully }
 *       404: { description: Feedback not found }
 */
router.get("/:id", getFeedbackById);

/**
 * @openapi
 * /api/feedbacks:
 *   post:
 *     tags: [Feedbacks]
 *     summary: Create a feedback
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customer_id, content, handler_id]
 *             properties:
 *               customer_id: { type: string }
 *               order_id: { type: string }
 *               content: { type: string }
 *               handler_id: { type: string }
 */
router.post("/", checkRole(DEALER_ROLES), createFeedback);

/**
 * @openapi
 * /api/feedbacks/{id}:
 *   put:
 *     tags: [Feedbacks]
 *     summary: Update a feedback
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
 *             description: Only staff/manager can update fields (except status)
 */
router.put("/:id", checkRole(DEALER_ROLES), updateFeedback);

/**
 * @openapi
 * /api/feedbacks/{id}:
 *   delete:
 *     tags: [Feedbacks]
 *     summary: Delete a feedback
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Feedback deleted successfully }
 *       404: { description: Feedback not found }
 */
router.delete("/:id", checkRole(DEALER_ROLES), deleteFeedback);

export default router;

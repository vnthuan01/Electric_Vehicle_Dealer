import express from "express";
import {
  createTestDrive,
  getTestDrives,
  getTestDriveById,
  updateTestDrive,
  deleteTestDrive,
} from "../controllers/testDriveController.js";
import {checkRole} from "../middlewares/checkRole.js";
import {DEALER_ROLES} from "../enum/roleEnum.js";
import {authenticate} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: TestDrives
 *     description: Manage test drive schedules
 */

/**
 * @openapi
 * /api/testdrives:
 *   get:
 *     tags: [TestDrives]
 *     summary: List test drives
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Test drive list retrieved successfully }
 */
router.get("/", getTestDrives);

/**
 * @openapi
 * /api/testdrives/{id}:
 *   get:
 *     tags: [TestDrives]
 *     summary: Get test drive by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Test drive detail retrieved successfully }
 *       404: { description: Test drive not found }
 */
router.get("/:id", getTestDriveById);

/**
 * @openapi
 * /api/testdrives:
 *   post:
 *     tags: [TestDrives]
 *     summary: Create a test drive schedule
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customer_id, vehicle_id, schedule_at]
 *             properties:
 *               customer_id: { type: string }
 *               vehicle_id: { type: string }
 *               dealership_id: { type: string }
 *               schedule_at: { type: string, format: date-time }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Test drive created successfully }
 *       400: { description: Invalid request }
 */
router.post("/", checkRole(DEALER_ROLES), createTestDrive);

/**
 * @openapi
 * /api/testdrives/{id}:
 *   put:
 *     tags: [TestDrives]
 *     summary: Update a test drive schedule
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
 *             description: All fields are optional
 */
router.put("/:id", checkRole(DEALER_ROLES), updateTestDrive);

/**
 * @openapi
 * /api/testdrives/{id}:
 *   delete:
 *     tags: [TestDrives]
 *     summary: Delete a test drive schedule
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Test drive deleted successfully }
 *       404: { description: Test drive not found }
 */
router.delete("/:id", checkRole(DEALER_ROLES), deleteTestDrive);

export default router;

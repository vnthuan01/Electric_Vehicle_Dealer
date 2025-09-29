import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import {MANAGEMENT_ROLES} from "../enum/roleEnum.js";
import {checkRole} from "../middlewares/checkRole.js";
import {authenticate} from "../middlewares/authMiddleware.js";
import {uploadUserAvatar} from "../utils/fileUpload.js";

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin or Dealer Manager with filters & pagination)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dealership_id
 *         schema: { type: string }
 *         description: Filter by dealership ID (Admin only)
 *       - in: query
 *         name: manufacturer_id
 *         schema: { type: string }
 *         description: Filter by manufacturer ID (Admin only)
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *         description: Filter by role name (Admin only)
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of users }
 *       403: { description: Access denied }
 */
router.get("/", checkRole(MANAGEMENT_ROLES), getAllUsers);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (Admin or Dealer Manager)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User detail }
 *       403: { description: Access denied }
 *       404: { description: User not found }
 */
router.get("/:id", checkRole(MANAGEMENT_ROLES), getUserById);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create user (Admin or Dealer Manager, supports avatar upload)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - phone
 *               - password
 *               - role_id
 *             properties:
 *               full_name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *               password: { type: string }
 *               role_id:
 *                 type: string
 *                 description: "ObjectId of role (Dealer Manager chỉ tạo được Dealer Staff)"
 *               dealership_id: { type: string, description: "Admin only" }
 *               manufacturer_id: { type: string, description: "Admin only" }
 *               avatar: { type: string, format: binary, description: User avatar image }
 *           example:
 *             full_name: "Nguyen Van A"
 *             email: "vana@example.com"
 *             phone: "0901234567"
 *             address: "123 Nguyen Hue, HCMC"
 *             password: "password123"
 *             role_id: "652f1b9a1234567890abcdef"
 *             dealership_id: "652f1b9a1234567890abcdea"
 *             manufacturer_id: "652f1b9a1234567890abcdeb"
 *     responses:
 *       201: { description: User created }
 *       403: { description: Access denied }
 */
router.post(
  "/",
  uploadUserAvatar.single("avatar"),
  checkRole(MANAGEMENT_ROLES),
  createUser
);

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user (Admin or Dealer Manager, supports avatar upload)
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
 *               full_name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *               password: { type: string }
 *               role_id: { type: string, description: "Admin only" }
 *               dealership_id: { type: string, description: "Admin only" }
 *               manufacturer_id: { type: string, description: "Admin only" }
 *               avatar: { type: string, format: binary, description: User avatar image }
 *     responses:
 *       200: { description: User updated }
 *       403: { description: Access denied }
 *       404: { description: User not found }
 */
router.put(
  "/:id",
  uploadUserAvatar.single("avatar"),
  checkRole(MANAGEMENT_ROLES),
  updateUser
);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user (Admin or Dealer Manager)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deleted }
 *       403: { description: Access denied }
 *       404: { description: User not found }
 */
router.delete("/:id", checkRole(MANAGEMENT_ROLES), deleteUser);

export default router;

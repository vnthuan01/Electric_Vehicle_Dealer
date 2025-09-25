import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import {ROLE} from "../enum/roleEnum.js";
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
 *     summary: Get all users (Admin only, with filters & pagination)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dealership_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: manufacturer_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
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
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", checkRole(ROLE.ADMIN), getAllUsers);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (Admin only)
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
 *         description: User detail
 */
router.get("/:id", checkRole(ROLE.ADMIN), getUserById);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create user (Admin only, supports avatar upload)
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
 *               - role_name
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               role_name:
 *                 type: string
 *               dealership_id:
 *                 type: string
 *               manufacturer_id:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: User avatar image
 *     responses:
 *       201:
 *         description: User created
 */
router.post(
  "/",
  uploadUserAvatar.single("avatar"),
  checkRole(ROLE.ADMIN),
  createUser
);

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user (Admin only, supports avatar upload)
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               role_name:
 *                 type: string
 *               dealership_id:
 *                 type: string
 *               manufacturer_id:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: User avatar image
 *     responses:
 *       200:
 *         description: User updated
 */
router.put(
  "/:id",
  uploadUserAvatar.single("avatar"),
  checkRole(ROLE.ADMIN),
  updateUser
);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user (Admin only)
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
 *         description: User deleted
 */
router.delete("/:id", checkRole(ROLE.ADMIN), deleteUser);

export default router;

import Role from "../models/Role.js";
import {AppError} from "../utils/AppError.js";
import {success} from "../utils/response.js";
import {RoleMessage} from "../utils/MessageRes.js";
import {paginate} from "../utils/pagination.js";
import {ROLE} from "../enum/roleEnum.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the role
 *         name:
 *           type: string
 *           enum: [Dealer Staff, Dealer Manager, EVM Staff, Admin]
 *           description: The name of the role
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the role was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the role was last updated
 *       example:
 *         _id: 60f7b3b3b3b3b3b3b3b3b3b3
 *         name: "Dealer Staff"
 *         createdAt: "2021-07-20T10:00:00.000Z"
 *         updatedAt: "2021-07-20T10:00:00.000Z"
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     description: Retrieve a paginated list of all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of roles per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for role name
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Fetched roles successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     totalRecords:
 *                       type: integer
 *                       example: 4
 *                     sort:
 *                       type: object
 *                       example: {"createdAt": -1}
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Role'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getAllRoles = async (req, res, next) => {
  try {
    let filter = {};

    // If logged-in user is Dealer Manager → restrict to Dealer Staff role only
    if (req.user?.role === ROLE.DEALER_MANAGER) {
      filter = {name: ROLE.DEALER_STAFF};
    } else if (req.user?.role === ROLE.EVM_STAFF) {
      filter = {name: {$nin: [ROLE.ADMIN, ROLE.EVM_STAFF]}};
    }

    // Pass filter into paginate
    const result = await paginate(Role, req, ["name"], filter);

    return success(res, RoleMessage.LIST_SUCCESS, result);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     description: Retrieve a specific role by its ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Fetched role successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getRoleById = async (req, res, next) => {
  try {
    const {id} = req.params;

    const role = await Role.findById(id).lean();

    if (!role) {
      return next(new AppError(RoleMessage.NOT_FOUND, 404));
    }

    return success(res, RoleMessage.DETAIL_SUCCESS, role);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role
 *     description: Create a new role with the specified name
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 enum: [Dealer Staff, Dealer Manager, EVM Staff, Admin]
 *                 description: The name of the role
 *           example:
 *             name: "Dealer Staff"
 *     responses:
 *       201:
 *         description: Role created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Role created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       400:
 *         description: Bad request - Invalid role data or role already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const createRole = async (req, res, next) => {
  try {
    const {name} = req.body;

    // Validate required fields
    if (!name) {
      return next(new AppError(RoleMessage.INVALID_REQUEST, 400));
    }

    // Check if role already exists
    const existingRole = await Role.findOne({name}).lean();
    if (existingRole) {
      return next(new AppError(RoleMessage.ROLE_ALREADY_EXISTS, 400));
    }

    // Create new role
    const role = await Role.create({name});

    return success(res, RoleMessage.CREATE_SUCCESS, role, 201);
  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      return next(new AppError(RoleMessage.INVALID_REQUEST, 400));
    }
    // Handle duplicate key error
    if (err.code === 11000) {
      return next(new AppError(RoleMessage.ROLE_ALREADY_EXISTS, 400));
    }
    next(new AppError(err.message, 500));
  }
};

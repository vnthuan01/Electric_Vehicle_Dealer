import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {MANAGEMENT_ROLES} from "../enum/roleEnum.js";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customerController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags:
 *       - Customers
 *     summary: List all customers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/", getCustomers);

/**
 * @openapi
 * /api/customers:
 *   post:
 *     tags:
 *       - Customers
 *     summary: Create a new customer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullname
 *               - phone
 *             properties:
 *               fullname:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *           example:
 *             full_name: "Nguyen Van A"
 *             phone: "0901234567"
 *             email: "vana@example.com"
 *             address: "123 Le Loi, District 1, HCMC"
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad Request
 */
router.post("/", createCustomer);

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Get customer by id
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
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.get("/:id", getCustomerById);

/**
 * @openapi
 * /api/customers/{id}:
 *   put:
 *     tags:
 *       - Customers
 *     summary: Update customer
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
 *               fullname:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *           example:
 *             full_name: "Tran Thi B"
 *             phone: "0912345678"
 *             email: "thib@example.com"
 *             address: "456 Tran Hung Dao, District 5, HCMC"
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.put("/:id", updateCustomer);

/**
 * @openapi
 * /api/customers/{id}:
 *   delete:
 *     tags:
 *       - Customers
 *     summary: Delete customer
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
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.delete("/:id", checkRole(MANAGEMENT_ROLES), deleteCustomer);

export default router;

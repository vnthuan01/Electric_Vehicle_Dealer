import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {MANAGEMENT_ROLES, ROLE} from "../enum/roleEnum.js";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerOrders,
  getCustomerPayments,
  getCustomerTestDrives,
  getCustomersOfYourself,
} from "../controllers/customerController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Lấy danh sách khách hàng thuộc đại lý (dealership)
 *     description: |
 *       Trả về danh sách khách hàng thuộc đại lý của người dùng hiện tại.
 *       Có thể tìm kiếm bằng từ khóa (`q`) theo họ tên, email hoặc số điện thoại.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: false
 *         description: Từ khóa tìm kiếm (theo họ tên, email hoặc số điện thoại)
 *     responses:
 *       200:
 *         description: Danh sách khách hàng được lấy thành công
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
 *                   example: Danh sách khách hàng đã được lấy thành công
 *       401:
 *         description: Người dùng chưa được xác thực (thiếu hoặc sai token)
 *       500:
 *         description: Lỗi hệ thống
 */
router.get("/", checkRole(ROLE.DEALER_MANAGER), getCustomers);

/**
 * @openapi
 * /api/customers/yourself:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Lấy danh sách khách hàng thuộc đại lý (dealership)
 *     description: |
 *       Trả về danh sách khách hàng đã sale bởi người dùng hiện tại.
 *       Có thể tìm kiếm bằng từ khóa (`q`) theo họ tên, email hoặc số điện thoại.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: false
 *         description: Từ khóa tìm kiếm (theo họ tên, email hoặc số điện thoại)
 *     responses:
 *       200:
 *         description: Danh sách khách hàng được lấy thành công
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
 *                   example: Danh sách khách hàng đã được lấy thành công
 *       401:
 *         description: Người dùng chưa được xác thực (thiếu hoặc sai token)
 *       500:
 *         description: Lỗi hệ thống
 */
router.get("/yourself", getCustomersOfYourself);

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

/**
 * @openapi
 * /api/customers/{id}/orders:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Get all orders of a customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: List of orders
 *       404:
 *         description: Customer not found
 */
router.get("/:id/orders", getCustomerOrders);

/**
 * @openapi
 * /api/customers/{id}/payments:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Get all payments of a customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: List of payments
 *       404:
 *         description: Customer not found
 */
router.get("/:id/payments", getCustomerPayments);

/**
 * @openapi
 * /api/customers/{id}/testdrives:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Get all testdrives of a customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: List of testdrives
 *       404:
 *         description: Customer not found
 */
router.get("/:id/testdrives", getCustomerTestDrives);

export default router;

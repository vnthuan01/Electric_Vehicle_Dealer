import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import { ROLE, EVM_ADMIN_ROLES, DEALER_ROLES } from "../enum/roleEnum.js";
import {
  getAllDealerships,
  getDealershipById,
  createDealership,
  deactivateDealership,
} from "../controllers/dealershipController.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Dealerships
 *     description: Manage dealerships
 */

// Middleware: bắt buộc đăng nhập
router.use(authenticate);

/**
 * @openapi
 * /api/dealerships:
 *   get:
 *     tags: [Dealerships]
 *     summary: Get all dealerships (EVM Staff only)
 *     description: EVM Staff có thể xem tất cả dealerships của manufacturer mình. Hỗ trợ filter đa dạng.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by company name or code
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *         description: Filter by active status
 *       - in: query
 *         name: province
 *         schema: { type: string }
 *         description: Filter by province (Hà Nội, TP.HCM, etc.)
 *       - in: query
 *         name: dealer_level
 *         schema: { type: string, enum: ["1S", "2S", "3S"] }
 *         description: Filter by dealer level (1S-Bán hàng, 2S-Bán hàng+Dịch vụ, 3S-Bán hàng+Dịch vụ+Phụ tùng)
 *       - in: query
 *         name: product_distribution
 *         schema: { type: string, enum: ["Ô tô", "Xe máy điện", "Ô tô và Xe máy điện"] }
 *         description: Filter by product distribution type
 *     responses:
 *       200: { description: OK }
 *       403: { description: Access denied }
 */
router.get("/", checkRole([ROLE.EVM_STAFF]), getAllDealerships);

/**
 * @swagger
 * /api/dealerships:
 *   post:
 *     summary: Create new dealership (EVM Staff only)
 *     tags: [Dealerships]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - company_name
 *               - business_license
 *               - tax_code
 *               - legal_representative
 *               - dealer_level
 *               - contract
 *               - address
 *               - contact
 *               - capabilities
 *             properties:
 *               code:
 *                 type: string
 *                 example: "VF_HN_3S_013"
 *               company_name:
 *                 type: string
 *                 example: "Showroom VinFast Mới"
 *               business_license:
 *                 type: string
 *                 example: "0123456789"
 *               tax_code:
 *                 type: string
 *                 example: "0123456789-013"
 *               legal_representative:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               dealer_level:
 *                 type: string
 *                 enum: ["1S", "2S", "3S"]
 *                 example: "3S"
 *               product_distribution:
 *                 type: string
 *                 enum: ["Ô tô", "Xe máy điện", "Ô tô và Xe máy điện"]
 *                 example: "Ô tô"
 *     responses:
 *       201: { description: Dealership created successfully }
 *       400: { description: Bad request }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.post("/", checkRole([ROLE.EVM_STAFF]), createDealership);

/**
 * @swagger
 * /api/dealerships/{id}:
 *   get:
 *     summary: Get dealership by ID
 *     tags: [Dealerships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dealership ID
 *     responses:
 *       200: { description: Success }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 *       404: { description: Not Found }
 */
router.get(
  "/:id",
  checkRole([ROLE.EVM_STAFF, ...DEALER_ROLES]),
  getDealershipById
);

/**
 * @swagger
 * /api/dealerships/{id}/deactivate:
 *   patch:
 *     summary: Deactivate dealership (EVM Staff only)
 *     tags: [Dealerships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dealership ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Vi phạm hợp đồng"
 *     responses:
 *       200: { description: Dealership deactivated successfully }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 *       404: { description: Not Found }
 */
router.patch("/:id/deactivate", checkRole([ROLE.EVM_STAFF]), deactivateDealership);

export default router;

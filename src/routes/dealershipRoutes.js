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
 *                 description: "Mã đại lý (unique) - Format: VF_{CITY}_{LEVEL}_{NUMBER}"
 *                 example: "VF_HN_3S_013"
 *               company_name:
 *                 type: string
 *                 description: "Tên công ty đại lý"
 *                 example: "Showroom VinFast Cầu Giấy"
 *               business_license:
 *                 type: string
 *                 description: "Số giấy phép kinh doanh"
 *                 example: "0108888999"
 *               tax_code:
 *                 type: string
 *                 description: "Mã số thuế (unique)"
 *                 example: "0108888999-013"
 *               legal_representative:
 *                 type: string
 *                 description: "Đại diện pháp lý"
 *                 example: "Nguyễn Văn Minh"
 *               dealer_level:
 *                 type: string
 *                 enum: ["1S", "2S", "3S"]
 *                 description: "Cấp độ đại lý: 1S (Showroom), 2S (Sales+Service), 3S (Full service)"
 *                 example: "3S"
 *               product_distribution:
 *                 type: string
 *                 enum: ["Ô tô", "Xe máy điện", "Ô tô và Xe máy điện"]
 *                 description: "Loại sản phẩm phân phối"
 *                 example: "Ô tô"
 *               contract:
 *                 type: object
 *                 description: "Thông tin hợp đồng"
 *                 required:
 *                   - contract_number
 *                   - signed_date
 *                   - expiry_date
 *                   - territory
 *                 properties:
 *                   contract_number:
 *                     type: string
 *                     description: "Số hợp đồng (unique)"
 *                     example: "HD_VF_013_2024"
 *                   signed_date:
 *                     type: string
 *                     format: date-time
 *                     description: "Ngày ký hợp đồng"
 *                     example: "2024-10-04T00:00:00.000Z"
 *                   expiry_date:
 *                     type: string
 *                     format: date-time
 *                     description: "Ngày hết hạn hợp đồng"
 *                     example: "2026-10-04T00:00:00.000Z"
 *                   territory:
 *                     type: string
 *                     description: "Khu vực kinh doanh"
 *                     example: "Hà Nội - Quận Cầu Giấy và lân cận"
 *                   exclusive_territory:
 *                     type: boolean
 *                     description: "Khu vực độc quyền"
 *                     example: false
 *               address:
 *                 type: object
 *                 description: "Địa chỉ đại lý"
 *                 required:
 *                   - street
 *                   - city
 *                   - province
 *                   - full_address
 *                 properties:
 *                   street:
 *                     type: string
 *                     description: "Số nhà, tên đường"
 *                     example: "456 Phố Xuân Thủy"
 *                   district:
 *                     type: string
 *                     description: "Quận/Huyện"
 *                     example: "Quận Cầu Giấy"
 *                   city:
 *                     type: string
 *                     description: "Thành phố"
 *                     example: "Hà Nội"
 *                   province:
 *                     type: string
 *                     description: "Tỉnh/Thành phố (để filter)"
 *                     example: "Thành phố Hà Nội"
 *                   full_address:
 *                     type: string
 *                     description: "Địa chỉ đầy đủ"
 *                     example: "456 Phố Xuân Thủy, phường Dịch Vọng Hậu, quận Cầu Giấy, TP. Hà Nội"
 *               contact:
 *                 type: object
 *                 description: "Thông tin liên hệ"
 *                 required:
 *                   - phone
 *                   - email
 *                 properties:
 *                   phone:
 *                     type: string
 *                     description: "Số điện thoại chính"
 *                     example: "024-3333-9999"
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: "Email liên hệ"
 *                     example: "caugiay@vinfast.vn"
 *                   hotline:
 *                     type: string
 *                     description: "Đường dây nóng (optional)"
 *                     example: "1900-3333"
 *               capabilities:
 *                 type: object
 *                 description: "Năng lực và dịch vụ"
 *                 required:
 *                   - showroom_area
 *                   - display_capacity
 *                   - total_staff
 *                   - sales_staff
 *                 properties:
 *                   showroom_area:
 *                     type: number
 *                     description: "Diện tích showroom (m²)"
 *                     example: 400
 *                   display_capacity:
 *                     type: number
 *                     description: "Số xe có thể trưng bày"
 *                     example: 12
 *                   total_staff:
 *                     type: number
 *                     description: "Tổng số nhân viên"
 *                     example: 18
 *                   sales_staff:
 *                     type: number
 *                     description: "Số nhân viên bán hàng"
 *                     example: 12
 *                   support_staff:
 *                     type: number
 *                     description: "Số nhân viên hỗ trợ (lái thử, phụ tùng)"
 *                     example: 6
 *                   services:
 *                     type: object
 *                     description: "Dịch vụ (tự động set theo dealer_level, có thể override)"
 *                     properties:
 *                       vehicle_sales:
 *                         type: boolean
 *                         description: "Bán xe - dịch vụ cốt lõi"
 *                         example: true
 *                       test_drive:
 *                         type: boolean
 *                         description: "Lái thử xe"
 *                         example: true
 *                       spare_parts_sales:
 *                         type: boolean
 *                         description: "Bán phụ tùng"
 *                         example: true
 *               notes:
 *                 type: string
 *                 description: "Ghi chú thêm"
 *                 example: "Đại lý 3S mới tại khu vực Cầu Giấy - Hà Nội"
 *     responses:
 *       201:
 *         description: Dealership created successfully
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
 *                   example: "Tạo đại lý thành công"
 *                 data:
 *                   type: object
 *                   description: "Thông tin đại lý vừa tạo với manufacturer và created_by được populate"
 *       400:
 *         description: Bad request - Validation error hoặc duplicate code/tax_code
 *       401:
 *         description: Unauthorized - Chưa đăng nhập
 *       403:
 *         description: Access denied - Không phải EVM Staff
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

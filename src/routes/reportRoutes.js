import express from "express";
import {
  getSalesReport,
  getTopSellingVehicles,
  getDealerStock,
  getSalesByStaff,
  exportSalesReport,
  exportTopSelling,
  exportDealerStock,
  exportSalesByStaff,
  getDealerManufacturerDebts,
  getDealerCustomerDebts,
  getManufacturerVehicleConsumption,
} from "../controllers/reportController.js";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {EVM_ADMIN_ROLES, MANAGEMENT_ROLES, ROLE} from "../enum/roleEnum.js";

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /api/reports/sales:
 *   get:
 *     tags: [Reports]
 *     summary: Doanh số theo thời gian / sản phẩm / đại lý
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Ngày bắt đầu khoảng thời gian tính doanh số (ví dụ: 2025-10-01). Hệ thống sẽ lấy các đơn hàng được tạo từ ngày này trở đi."
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Ngày kết thúc khoảng thời gian tính doanh số (ví dụ: 2025-10-20). Hệ thống sẽ lấy các đơn hàng được tạo đến hết ngày này."
 *       - in: query
 *         name: dealership_id
 *         schema: { type: string }
 *     responses:
 *       200: { description: Báo cáo doanh số thành công }
 */
router.get("/sales", checkRole([...MANAGEMENT_ROLES]), getSalesReport);

/**
 * @openapi
 * /api/reports/top-selling:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Top sản phẩm bán chạy (theo thời gian)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Ngày bắt đầu khoảng thời gian cần thống kê (ví dụ: 2025-10-01)"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Ngày kết thúc khoảng thời gian cần thống kê (ví dụ: 2025-10-20)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: "Giới hạn số lượng sản phẩm trả về (mặc định là 5)"
 *     responses:
 *       200:
 *         description: "Danh sách sản phẩm bán chạy được lấy thành công"
 */
router.get(
  "/top-selling",
  checkRole([...MANAGEMENT_ROLES]),
  getTopSellingVehicles
);

/**
 * @openapi
 * /api/reports/dealer-stock:
 *   get:
 *     tags: [Reports]
 *     summary: Báo cáo tồn kho của tất cả các Đại lý
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Dữ liệu tồn kho đại lý }
 */
router.get("/dealer-stock", checkRole([...MANAGEMENT_ROLES]), getDealerStock);

/**
 * @openapi
 * /api/reports/sales-by-staff:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Doanh số theo nhân viên bán hàng của Dealer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Ngày bắt đầu khoảng thời gian cần thống kê (ví dụ: 2025-10-01)"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Ngày kết thúc khoảng thời gian cần thống kê (ví dụ: 2025-10-20)"
 *     responses:
 *       200:
 *         description: "Báo cáo doanh số theo nhân viên được lấy thành công"
 */
router.get("/sales-by-staff", checkRole(ROLE.DEALER_MANAGER), getSalesByStaff);

/**
 * @openapi
 * /api/reports/debts-customer:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Báo cáo công nợ cho Customer của Dealer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: "Trạng thái công nợ cho customer debts, ví dụ: partial,settled"
 *     responses:
 *       200:
 *         description: "Báo cáo công nợ Dealer thành công"
 */
router.get(
  "/debts-customer",
  checkRole(ROLE.DEALER_MANAGER),
  getDealerCustomerDebts
);

/**
 * @openapi
 * /api/reports/debts-manufacturer:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Báo công nợ cho Manufacturer của Dealer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: "Trạng thái công nợ cho customer debts, ví dụ: partial,settled"
 *     responses:
 *       200:
 *         description: "Báo cáo công nợ Dealer thành công"
 */
router.get(
  "/debts-manufacturer",
  checkRole(ROLE.DEALER_MANAGER),
  getDealerManufacturerDebts
);

/**
 * @openapi
 * /api/reports/manufacturer/vehicle-consumption:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Manufacturer vehicle consumption velocity
 *     description: Tốc độ tiêu thụ xe theo từng hãng trong khoảng thời gian
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (mặc định 30 ngày trước endDate nếu không truyền)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (mặc định hiện tại nếu không truyền)
 *       - in: query
 *         name: manufacturer_id
 *         schema:
 *           type: string
 *         description: Lọc theo một hãng cụ thể
 *     responses:
 *       200:
 *         description: Dữ liệu tốc độ tiêu thụ xe theo hãng
 */
router.get(
  "/manufacturer/vehicle-consumption",
  checkRole(ROLE.EVM_STAFF),
  getManufacturerVehicleConsumption
);

/**
 * @openapi
 * /api/reports/export/sales:
 *   get:
 *     tags: [Reports]
 *     summary: Xuất Excel - Doanh số theo thời gian / sản phẩm / đại lý
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File Excel doanh số
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
router.get(
  "/export/sales",
  checkRole([...MANAGEMENT_ROLES]),
  exportSalesReport
);

/**
 * @openapi
 * /api/reports/export/top-selling:
 *   get:
 *     tags: [Reports]
 *     summary: Xuất Excel - Top sản phẩm bán chạy
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File Excel doanh số
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
router.get(
  "/export/top-selling",
  checkRole([...MANAGEMENT_ROLES]),
  exportTopSelling
);

/**
 * @openapi
 * /api/reports/export/dealer-stock:
 *   get:
 *     tags: [Reports]
 *     summary: Xuất Excel - Tồn kho của tất cả các Đại lý
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File Excel doanh số
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
router.get(
  "/export/dealer-stock",
  checkRole([...MANAGEMENT_ROLES]),
  exportDealerStock
);

/**
 * @openapi
 * /api/reports/export/sales-by-staff:
 *   get:
 *     tags: [Reports]
 *     summary: Xuất Excel - Doanh số theo nhân viên
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File Excel doanh số
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
router.get(
  "/export/sales-by-staff",
  checkRole([...MANAGEMENT_ROLES]),
  exportSalesByStaff
);

export default router;

import express from "express";
import {
  submitBankLoanApplication,
  approveBankLoan,
  rejectBankLoan,
  disburseBankLoan,
  getBankLoanById,
  listBankLoans,
} from "../controllers/bankLoanController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import { ROLE } from "../enum/roleEnum.js";

const router = express.Router();

/**
 * ==================== BANK LOAN ROUTES ====================
 * 
 * Luồng trả góp thông qua ngân hàng
 * - Chỉ nhân viên đại lý (DEALER_STAFF, DEALER_MANAGER) có quyền
 */

// ========== 1. LIST BANK LOANS ==========
/**
 * GET /api/bank-loans
 * Danh sách các hồ sơ vay (có thể filter)
 * 
 * Query:
 * - status: "submitted" | "approved" | "rejected" | "funded" (optional)
 * - bank_id: (optional)
 * - customer_id: (optional)
 * - dealership_id: (optional)
 * - page: (default 1)
 * - limit: (default 20)
 * 
 * Response: { success, count, total, page, pages, data: [...] }
 */
router.get(
  "/",
  authMiddleware,
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER, ROLE.ADMIN]),
  listBankLoans
);

// ========== 2. GET BANK LOAN BY ID ==========
/**
 * GET /api/bank-loans/:loan_id
 * Chi tiết hồ sơ vay
 * 
 * Response: { success, data: { _id, order_id, bank_id, status, ... } }
 */
router.get(
  "/:id",
  authMiddleware,
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER, ROLE.ADMIN]),
  getBankLoanById
);

// ========== 3. SUBMIT BANK LOAN ==========
/**
 * POST /api/bank-loans/submit
 * Nhân viên Đại lý gửi hồ sơ vay cho Ngân Hàng
 * 
 * Body:
 * {
 *   order_id: "...",
 *   bank_id: "...",           // ⭐ Chọn từ danh sách Bank (GET /api/banks)
 *   loan_term_months: 24,     // 12-60 tháng
 *   documents: [
 *     {
 *       name: "CMND",
 *       type: "id_card",
 *       file_url: "https://..."
 *     },
 *     {
 *       name: "Bảng lương",
 *       type: "salary_statement",
 *       file_url: "https://..."
 *     }
 *   ],
 *   customer_income: 15000000,
 *   credit_score: "Good",     // Poor | Fair | Good | Very Good | Excellent
 *   co_signer: {
 *     name: "...",
 *     phone: "...",
 *     relationship: "Spouse"
 *   },
 *   notes: "..."
 * }
 * 
 * Response: { success, message, data: { bank_loan, order } }
 * 
 * Order Status Changes: "deposit_paid" → "waiting_bank_approval"
 */
router.post(
  "/submit",
  authMiddleware,
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER]),
  submitBankLoanApplication
);

// ========== 4. APPROVE BANK LOAN ==========
/**
 * PUT /api/bank-loans/:loan_id/approve
 * Nhân viên Đại lý xác nhận Ngân Hàng đã duyệt hồ sơ
 * 
 * Body:
 * {
 *   approved_amount: 50000000,            // Số tiền ngân hàng duyệt
 *   approval_reference_code: "TCB_2025_001",
 *   approval_notes: "Duyệt toàn bộ"       // (optional)
 * }
 * 
 * Response: { success, message, data: { ... } }
 * 
 * Status Changes: "submitted" → "approved"
 * Order Status: vẫn "waiting_bank_approval" (chưa giải ngân)
 */
router.put(
  "/:id/approve",
  authMiddleware,
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER]),
  approveBankLoan
);

// ========== 5. REJECT BANK LOAN ==========
/**
 * PUT /api/bank-loans/:loan_id/reject
 * Nhân viên Đại lý xác nhận Ngân Hàng đã từng chối hồ sơ
 * 
 * Body:
 * {
 *   rejection_reason: "Thu nhập không đủ"
 * }
 * 
 * Response: { success, message, data: { bank_loan, order } }
 * 
 * Status Changes: "submitted" → "rejected"
 * Order Status: "waiting_bank_approval" → "deposit_paid" (được phép resubmit)
 */
router.put(
  "/:id/reject",
  authMiddleware,
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER]),
  rejectBankLoan
);

// ========== 6. DISBURSE BANK LOAN ==========
/**
 * POST /api/bank-loans/:loan_id/disburse
 * Nhân viên Đại lý xác nhận Ngân Hàng đã giải ngân tiền
 * 
 * ⚠️ TRƯỚC KHI CALL API NÀY:
 * 1. Kiểm tra tài khoản ngân hàng đã nhận tiền
 * 2. Ghi lại mã giao dịch từ ngân hàng
 * 3. Chuẩn bị ngày trả góp đầu tiên
 * 
 * Body:
 * {
 *   disbursed_amount: 50000000,
 *   disbursement_reference_code: "TXN_2025_001",
 *   disbursement_notes: "Giải ngân thành công",  // (optional)
 *   first_payment_date: "2025-02-15"             // Ngày KH bắt đầu trả góp
 * }
 * 
 * Response: { success, message, data: { bank_loan, payment, order } }
 * 
 * Auto Changes:
 * ✅ Status: "approved" → "funded"
 * ✅ Order Status: "waiting_bank_approval" → "fully_paid"
 * ✅ Order Debt: Tự động settle (ghi nhận đã thanh toán)
 * ✅ Payment: Tạo Payment từ bank
 * ✅ Order ready for: markVehicleReady → deliverOrder
 */
router.post(
  "/:id/disburse",
  authMiddleware,
  checkRole([ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER]),
  disburseBankLoan
);

export default router;

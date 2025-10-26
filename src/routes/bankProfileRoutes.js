import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import { DEALER_ROLES } from "../enum/roleEnum.js";
import {
  createBankProfile,
  getBankProfiles,
  getBankProfileById,
  updateBankProfile,
  updateBankProfileStatus,
  deleteBankProfile,
} from "../controllers/bankProfileController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/bank-profiles:
 *   post:
 *     tags: [Bank Profiles]
 *     summary: Create bank profile for installment order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order_id, bank_name, loan_amount, down_payment]
 *             properties:
 *               order_id:
 *                 type: string
 *               bank_name:
 *                 type: string
 *               bank_code:
 *                 type: string
 *               loan_officer:
 *                 type: object
 *                 properties:
 *                   name: {type: string}
 *                   phone: {type: string}
 *                   email: {type: string}
 *               loan_amount:
 *                 type: number
 *               down_payment:
 *                 type: number
 *               loan_term_months:
 *                 type: number
 *               interest_rate:
 *                 type: number
 *               monthly_payment:
 *                 type: number
 *               customer_income:
 *                 type: number
 *               credit_score:
 *                 type: string
 *               co_signer:
 *                 type: object
 *                 properties:
 *                   name: {type: string}
 *                   phone: {type: string}
 *                   relationship: {type: string}
 *               documents:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name: {type: string}
 *                     type: {type: string}
 *                     file_url: {type: string}
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad Request
 */
router.post("/", checkRole(DEALER_ROLES), createBankProfile);

/**
 * @openapi
 * /api/bank-profiles:
 *   get:
 *     tags: [Bank Profiles]
 *     summary: Get bank profiles for dealership
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, submitted, under_review, approved, rejected, funded, canceled]
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/", checkRole(DEALER_ROLES), getBankProfiles);

/**
 * @openapi
 * /api/bank-profiles/{id}:
 *   get:
 *     tags: [Bank Profiles]
 *     summary: Get bank profile by id
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
router.get("/:id", checkRole(DEALER_ROLES), getBankProfileById);

/**
 * @openapi
 * /api/bank-profiles/{id}:
 *   put:
 *     tags: [Bank Profiles]
 *     summary: Update bank profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bank_name: {type: string}
 *               bank_code: {type: string}
 *               loan_officer: {type: object}
 *               loan_amount: {type: number}
 *               down_payment: {type: number}
 *               loan_term_months: {type: number}
 *               interest_rate: {type: number}
 *               monthly_payment: {type: number}
 *               customer_income: {type: number}
 *               credit_score: {type: string}
 *               co_signer: {type: object}
 *               documents: {type: array}
 *               notes: {type: string}
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.put("/:id", checkRole(DEALER_ROLES), updateBankProfile);

/**
 * @openapi
 * /api/bank-profiles/{id}/status:
 *   patch:
 *     tags: [Bank Profiles]
 *     summary: Update bank profile status
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, submitted, under_review, approved, rejected, funded, canceled]
 *               notes:
 *                 type: string
 *               rejection_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Bad Request
 *       404:
 *         description: Not Found
 */
router.patch("/:id/status", checkRole(DEALER_ROLES), updateBankProfileStatus);

/**
 * @openapi
 * /api/bank-profiles/{id}:
 *   delete:
 *     tags: [Bank Profiles]
 *     summary: Delete bank profile (only if status is pending)
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
 *         description: Deleted
 *       404:
 *         description: Not Found
 */
router.delete("/:id", checkRole(DEALER_ROLES), deleteBankProfile);

export default router;

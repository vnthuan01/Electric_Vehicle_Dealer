import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import { ROLE, EVM_ADMIN_ROLES } from "../enum/roleEnum.js";
import { validateBody, schemas } from "../utils/validator.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Dealership Applications
 *     description: Dealership registration and approval management
 */

/**
 * @openapi
 * /api/dealership-applications/submit:
 *   post:
 *     tags:
 *       - Dealership Applications
 *     summary: Submit new dealership application (Public)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_name
 *               - business_license
 *               - tax_code
 *               - contact_person
 *               - phone
 *               - email
 *               - address
 *               - business_type
 *               - manufacturer_id
 *             properties:
 *               company_name:
 *                 type: string
 *                 example: "ABC Electric Motors"
 *               business_license:
 *                 type: string
 *                 example: "0123456789"
 *               tax_code:
 *                 type: string
 *                 example: "0123456789-001"
 *               contact_person:
 *                 type: string
 *                 example: "Nguyen Van A"
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "contact@abcmotors.com"
 *               address:
 *                 type: string
 *                 example: "123 Main St, Ho Chi Minh City"
 *               business_type:
 *                 type: string
 *                 enum: [retail, wholesale, both]
 *                 example: "retail"
 *               expected_sales_volume:
 *                 type: number
 *                 example: 100
 *               showroom_area:
 *                 type: number
 *                 example: 500
 *               warehouse_area:
 *                 type: number
 *                 example: 200
 *               registered_capital:
 *                 type: number
 *                 example: 5000000000
 *               annual_revenue:
 *                 type: number
 *                 example: 10000000000
 *               years_in_business:
 *                 type: number
 *                 example: 5
 *               automotive_experience:
 *                 type: boolean
 *                 example: true
 *               ev_experience:
 *                 type: boolean
 *                 example: false
 *               manufacturer_id:
 *                 type: string
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *               documents:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [business_license, tax_certificate, showroom_photos, financial_statement, other]
 *                     url:
 *                       type: string
 *                     name:
 *                       type: string
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       400:
 *         description: Validation error or duplicate email
 */
router.post("/submit", authenticate, checkRole(ROLE.EVM_STAFF)  ,validateBody(schemas.dealershipApplication), submitApplication);

/**
 * @openapi
 * /api/dealership-applications:
 *   get:
 *     tags:
 *       - Dealership Applications
 *     summary: Get all dealership applications (EVM Staff, Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, under_review, approved, rejected, cancelled]
 *       - name: manufacturer_id
 *         in: query
 *         schema:
 *           type: string
 *       - name: q
 *         in: query
 *         description: Search by company name, contact person, or email
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get("/", authenticate, checkRole(EVM_ADMIN_ROLES), getApplications);

/**
 * @openapi
 * /api/dealership-applications/{id}:
 *   get:
 *     tags:
 *       - Dealership Applications
 *     summary: Get application by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application retrieved successfully
 *       404:
 *         description: Application not found
 */
router.get("/:id", authenticate, checkRole(EVM_ADMIN_ROLES), getApplicationById);

/**
 * @openapi
 * /api/dealership-applications/{id}/approve:
 *   post:
 *     tags:
 *       - Dealership Applications
 *     summary: Approve dealership application
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               review_notes:
 *                 type: string
 *                 example: "All documents verified. Welcome to our network!"
 *               dealership_code:
 *                 type: string
 *                 example: "DL001"
 *     responses:
 *       200:
 *         description: Application approved successfully
 *       400:
 *         description: Invalid status for approval
 *       404:
 *         description: Application not found
 */
router.post("/:id/approve", authenticate, checkRole(EVM_ADMIN_ROLES), validateBody(schemas.approveApplication), approveApplication);

/**
 * @openapi
 * /api/dealership-applications/{id}/reject:
 *   post:
 *     tags:
 *       - Dealership Applications
 *     summary: Reject dealership application
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejection_reason
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 example: "Insufficient business experience in automotive sector"
 *               review_notes:
 *                 type: string
 *                 example: "Please gain more experience and reapply in 2 years"
 *     responses:
 *       200:
 *         description: Application rejected successfully
 *       400:
 *         description: Invalid status for rejection
 *       404:
 *         description: Application not found
 */
router.post("/:id/reject", authenticate, checkRole(EVM_ADMIN_ROLES), validateBody(schemas.rejectApplication), rejectApplication);

/**
 * @openapi
 * /api/dealership-applications/{id}/under-review:
 *   post:
 *     tags:
 *       - Dealership Applications
 *     summary: Mark application as under review
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application marked as under review
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Application not found
 */
router.post("/:id/under-review", authenticate, checkRole(EVM_ADMIN_ROLES), markUnderReview);

export default router;

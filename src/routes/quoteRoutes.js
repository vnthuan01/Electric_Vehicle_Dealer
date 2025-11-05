import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {DEALER_ROLES} from "../enum/roleEnum.js";
import {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  deleteQuote,
  exportQuotePDF,
} from "../controllers/quoteController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Quotes
 *     description: Manage vehicle quotations (soft delete, auto-expire, editable only while valid)
 */

/**
 * @openapi
 * /api/quotes:
 *   post:
 *     tags:
 *       - Quotes
 *     summary: Create a new quotation
 *     description: Create a quotation for one or multiple vehicles. Each item includes vehicle, options, accessories, discount, and promotion.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [vehicle_id]
 *                   properties:
 *                     vehicle_id:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       default: 1
 *                     discount:
 *                       type: number
 *                       default: 0
 *                     promotion_id:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [option_id]
 *                         properties:
 *                           option_id:
 *                             type: string
 *                     accessories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [accessory_id, quantity]
 *                         properties:
 *                           accessory_id:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                             default: 1
 *                     color:
 *                       type: string
 *                       description: Vehicle color chosen
 *                       example: "Red"
 *               notes:
 *                 type: string
 *           example:
 *             notes: "Quotation valid for 7 days, includes 2 accessories."
 *             customer_id: "68da326b8de50de3aa8abed5"
 *             items:
 *               - vehicle_id: "68eb1bb987b0bc1a6f817efb"
 *                 quantity: 1
 *                 discount: 2000
 *                 color: "Red"
 *                 promotion_id: "68e66da88a31a08794fd0b64"
 *                 options:
 *                   - option_id: "68d137662d41dc0589f4c9a4"
 *                   - option_id: "68d137662d41dc0589f4c9a3"
 *                 accessories:
 *                   - accessory_id: "68d137ac2d41dc0589f4c9ab"
 *                     quantity: 1
 *     responses:
 *       201:
 *         description: Quotation created successfully
 *       400:
 *         description: Invalid input or empty items
 */
router.post("/", checkRole([...DEALER_ROLES]), createQuote);

/**
 * @openapi
 * /api/quotes:
 *   get:
 *     tags:
 *       - Quotes
 *     summary: List all valid or active quotations
 *     description: Returns paginated list of quotations that are still valid (not canceled or expired)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Keyword search by code or notes
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: string
 *         description: Filter quotes by specific customer
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: OK, returns paginated list of quotes
 */
router.get("/", checkRole([...DEALER_ROLES]), getQuotes);

/**
 * @openapi
 * /api/quotes/{id}:
 *   get:
 *     tags:
 *       - Quotes
 *     summary: Get quote by ID
 *     description: Returns detail of a quotation by ID. Automatically updates status to expired if endDate passed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote document _id
 *     responses:
 *       200:
 *         description: OK, returns quote detail
 *       404:
 *         description: Quote not found
 */
router.get("/:id", checkRole([...DEALER_ROLES]), getQuoteById);

/**
 * @openapi
 * /api/quotes/{id}:
 *   put:
 *     tags:
 *       - Quotes
 *     summary: Update quotation (items, notes, or status)
 *     description: |
 *       Allows editing only while the quotation is still **valid** and not expired.
 *       Automatically recalculates total amount when items are changed.
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
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [vehicle_id]
 *                   properties:
 *                     vehicle_id: { type: string }
 *                     quantity: { type: number, default: 1 }
 *                     discount: { type: number, default: 0 }
 *                     promotion_id: { type: string }
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           option_id: { type: string }
 *                     accessories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           accessory_id: { type: string }
 *                           quantity: { type: number, default: 1 }
 *                     color: { type: string, description: "Vehicle color chosen" }
 *               notes: { type: string }
 *               status:
 *                 type: string
 *                 enum: [expired, canceled]
 *           example:
 *             notes: "Gia hạn báo giá thêm 3 ngày"
 *             items:
 *               - vehicle_id: "68d39a14fde880da56c7f0d0"
 *                 quantity: 1
 *                 discount: 1500
 *                 color: "Blue"
 *                 promotion_id: ""
 *                 options: []
 *                 accessories: []
 *     responses:
 *       200:
 *         description: Updated successfully
 *       400:
 *         description: Quote expired or canceled
 *       404:
 *         description: Quote not found
 */
router.put("/:id", checkRole([...DEALER_ROLES]), updateQuote);

/**
 * @openapi
 * /api/quotes/{id}:
 *   delete:
 *     tags:
 *       - Quotes
 *     summary: Soft delete quotation (mark as canceled)
 *     description: Marks the quotation as canceled. Expired or already canceled quotes cannot be deleted again.
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
 *         description: Quote canceled successfully
 *       400:
 *         description: Already canceled or expired
 *       404:
 *         description: Quote not found
 */
router.delete("/:id", checkRole([...DEALER_ROLES]), deleteQuote);

/**
 * @openapi
 * /api/quotes/{id}/export:
 *   get:
 *     tags:
 *       - Quotes
 *     summary: Export quotation as PDF
 *     description: Generates a PDF for the quotation and returns it as a download. Supports multiple vehicles per quote.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote document _id
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Quote not found
 */
router.get("/:id/export", checkRole([...DEALER_ROLES]), exportQuotePDF);

export default router;

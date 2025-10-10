import {Router} from "express";
import {authenticate} from "../middlewares/authMiddleware.js";
import {checkRole} from "../middlewares/checkRole.js";
import {DEALER_ROLES} from "../enum/roleEnum.js";
import {uploadContract} from "../utils/fileUpload.js";
import {
  generateContract,
  uploadSignedContract,
  getContractInfo,
  getTemplates,
  saveTemplate,
  deleteSignedContract,
} from "../controllers/contractController.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/contracts/templates:
 *   get:
 *     tags: [Contracts]
 *     summary: Get available contract templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved
 */
router.get("/templates", checkRole(DEALER_ROLES), getTemplates);

/**
 * @openapi
 * /api/contracts/templates:
 *   post:
 *     tags: [Contracts]
 *     summary: Save custom contract template
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [template_name, html_content]
 *             properties:
 *               template_name:
 *                 type: string
 *               html_content:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template saved
 *       400:
 *         description: Bad Request
 */
router.post("/templates", checkRole(DEALER_ROLES), saveTemplate);

/**
 * @openapi
 * /api/contracts/orders/{order_id}/generate:
 *   post:
 *     tags: [Contracts]
 *     summary: Generate contract PDF for order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               template_name:
 *                 type: string
 *                 default: "default"
 *               template_data:
 *                 type: object
 *                 properties:
 *                   location:
 *                     type: string
 *                   dealership:
 *                     type: object
 *                   downPayment:
 *                     type: number
 *     responses:
 *       200:
 *         description: PDF generated
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Order not found
 */
router.post(
  "/orders/:order_id/generate",
  checkRole(DEALER_ROLES),
  generateContract
);

/**
 * @openapi
 * /api/contracts/orders/{order_id}/upload:
 *   post:
 *     tags: [Contracts]
 *     summary: Upload signed contract (PDF/image)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               contract:
 *                 type: string
 *                 format: binary
 *                 description: PDF or image file of signed contract
 *     responses:
 *       200:
 *         description: Contract uploaded
 *       400:
 *         description: Bad Request
 *       404:
 *         description: Order not found
 */
router.post(
  "/orders/:order_id/upload",
  checkRole(DEALER_ROLES),
  uploadContract.single("contract"),
  uploadSignedContract
);

/**
 * @openapi
 * /api/contracts/orders/{order_id}:
 *   get:
 *     tags: [Contracts]
 *     summary: Get contract information for order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract info retrieved
 *       404:
 *         description: Order not found
 */
router.get("/orders/:order_id", checkRole(DEALER_ROLES), getContractInfo);

/**
 * @openapi
 * /api/contracts/orders/{order_id}:
 *   delete:
 *     tags: [Contracts]
 *     summary: Delete signed contract
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract deleted
 *       404:
 *         description: Order not found
 */
router.delete(
  "/orders/:order_id",
  checkRole(DEALER_ROLES),
  deleteSignedContract
);

export default router;

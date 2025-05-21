import { Router } from 'express';
import { getAllEwaste, createEwaste } from '../controllers/ewasteController';
import { isAdmin } from '../middlewares/role';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Ewaste
 *   description: E-waste management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Ewaste:
 *       type: object
 *       required:
 *         - id
 *         - user_id
 *         - name
 *         - category
 *         - quantity
 *         - estimated_price
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the e-waste item
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user who submitted the e-waste
 *         detection_id:
 *           type: string
 *           format: uuid
 *           description: ID of the detection this e-waste is based on
 *         name:
 *           type: string
 *           description: Name of the e-waste item
 *         category:
 *           type: string
 *           description: Category of the e-waste
 *         quantity:
 *           type: number
 *           minimum: 1
 *           description: Quantity of the e-waste item
 *         estimated_price:
 *           type: number
 *           minimum: 0
 *           description: Estimated price of the e-waste item
 *         image_url:
 *           type: string
 *           description: URL of the e-waste image
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the e-waste was created
 */

/**
 * @swagger
 * /ewaste:
 *   get:
 *     summary: Get all e-waste items
 *     tags: [Ewaste]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of e-waste items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ewaste'
 *       401:
 *         description: Unauthorized - admin access required
 * 
 *   post:
 *     summary: Create a new e-waste item
 *     tags: [Ewaste]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - detection_id
 *               - user_id
 *               - name
 *               - category
 *               - quantity
 *               - estimated_price
 *             properties:
 *               detection_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the detection this e-waste is based on
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user submitting the e-waste
 *               name:
 *                 type: string
 *                 description: Name of the e-waste item
 *               category:
 *                 type: string
 *                 description: Category of the e-waste
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 description: Quantity of the e-waste item
 *               estimated_price:
 *                 type: number
 *                 minimum: 0
 *                 description: Estimated price of the e-waste item
 *               image_url:
 *                 type: string
 *                 description: URL of the e-waste image
 *     responses:
 *       201:
 *         description: E-waste item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ewaste'
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized - admin access required
 */

router.get('/', isAdmin, getAllEwaste);
router.post('/', isAdmin, createEwaste);

export default router; 
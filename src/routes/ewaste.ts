import { Router } from 'express';
import { getAllEwaste, createEwaste } from '../controllers/ewasteController';
import { isAdmin } from '../middlewares/role';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Ewaste
 *   description: E-waste inventory management system
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
 *           nullable: true
 *           description: ID of the detection this e-waste is based on (if applicable)
 *         name:
 *           type: string
 *           description: Name or description of the e-waste item
 *         category:
 *           type: string
 *           description: Category of the e-waste (e.g., Keyboard, Monitor, Battery)
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantity of the e-waste item
 *         estimated_price:
 *           type: number
 *           format: float
 *           nullable: true
 *           minimum: 0
 *           description: Estimated price of the e-waste item in IDR
 *         image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL of the e-waste image
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the e-waste record was created
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         user_id: "d0ac0ecb-b4d7-4d81-bcd7-c0bcec391527"
 *         detection_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         name: "Dell Keyboard Model KB216"
 *         category: "Keyboard"
 *         quantity: 2
 *         estimated_price: 75000
 *         image_url: "https://storage.googleapis.com/ebs-bucket/detection_123456.jpg"
 *         created_at: "2023-06-01T12:00:00Z"
 */

/**
 * @swagger
 * /ewaste:
 *   get:
 *     summary: Get all e-waste items
 *     description: Admin-only endpoint to retrieve all e-waste items in the system
 *     tags: [Ewaste]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of e-waste items successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ewaste'
 *       401:
 *         description: Unauthorized - valid token required
 *       403:
 *         description: Forbidden - admin access required
 * 
 *   post:
 *     summary: Create a new e-waste record
 *     description: Admin-only endpoint to manually add an e-waste item to the inventory
 *     tags: [Ewaste]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - name
 *               - category
 *               - quantity
 *             properties:
 *               detection_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the detection this e-waste is based on (optional)
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user submitting the e-waste
 *               name:
 *                 type: string
 *                 description: Name or description of the e-waste item
 *                 example: "HP Laptop Model 15-bs013dx"
 *               category:
 *                 type: string
 *                 description: Category of the e-waste
 *                 example: "Laptop"
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity of the e-waste item
 *                 example: 1
 *               estimated_price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Estimated price of the e-waste item in IDR
 *                 example: 1500000
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: URL of the e-waste image (optional)
 *                 example: "https://storage.googleapis.com/ebs-bucket/ewaste_123456.jpg"
 *     responses:
 *       201:
 *         description: E-waste record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ewaste'
 *       400:
 *         description: Bad request - missing required fields or invalid data
 *       401:
 *         description: Unauthorized - valid token required
 *       403:
 *         description: Forbidden - admin access required
 */

router.get('/', isAdmin, getAllEwaste);
router.post('/', isAdmin, createEwaste);

export default router; 
import { Router } from 'express';
import upload from '../middlewares/upload';
import { isAdmin } from '../middlewares/role';
import * as detectionController from '../controllers/detectionController';
import { updateDetection } from '../controllers/detectionController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Detections
 *   description: E-waste detection endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Detection:
 *       type: object
 *       required:
 *         - id
 *         - user_id
 *         - scan_id
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the detection
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user who created the detection
 *         scan_id:
 *           type: string
 *           format: uuid
 *           description: ID of the scan this detection belongs to
 *         image_url:
 *           type: string
 *           description: URL of the detected image
 *         detection_source:
 *           type: string
 *           nullable: true
 *           description: Source of the detection (e.g., 'YOLO', 'Gemini Interfered')
 *         category:
 *           type: string
 *           description: Category of the detected e-waste
 *         confidence:
 *           type: number
 *           format: float
 *           description: Confidence score of the detection
 *         regression_result:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Estimated price from regression model
 *         description:
 *           type: string
 *           nullable: true
 *           description: Detailed description of the detection (max 40 words)
 *         suggestion:
 *           type: string
 *           nullable: true
 *           description: Suggestions for handling the e-waste (up to 3 points, joined by ' | ')
 *         risk_lvl:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           nullable: true
 *           description: Risk level of the e-waste (1-10)
 *         scans:
 *           type: object
 *           description: Related scan information
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               description: Scan ID
 *             user_id:
 *               type: string
 *               format: uuid
 *               description: User ID who created the scan
 *             status:
 *               type: string
 *               enum: [pending, processing, completed, failed]
 *               description: Status of the scan
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the detection was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the detection was last updated
 */

/**
 * @swagger
 * /detections:
 *   post:
 *     summary: Create a new detection with scan
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - user_id
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file to analyze for e-waste detection
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user creating the detection
 *     responses:
 *       201:
 *         description: Detection created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Server error
 * 
 *   get:
 *     summary: Get all detections with filters
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for category or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: detection_source
 *         schema:
 *           type: string
 *         description: Filter by detection source
 *     responses:
 *       200:
 *         description: List of detections
 *       401:
 *         description: Unauthorized - admin access required
 * 
 * /detections/{id}:
 *   get:
 *     summary: Get detection by ID
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Detection ID
 *     responses:
 *       200:
 *         description: Detection details
 *       404:
 *         description: Detection not found
 * 
 *   put:
 *     summary: Update detection
 *     description: Update the detection using the authenticated user. The user_id from the authentication token is used to verify ownership.
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Detection ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 description: Updated description
 *               suggestion:
 *                 type: string
 *                 description: Updated suggestions (up to 3 points, joined by ' | ')
 *               category:
 *                 type: string
 *                 description: Updated category
 *               risk_lvl:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 description: Updated risk level
 *     responses:
 *       200:
 *         description: Detection updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Detection'
 *       401:
 *         description: Unauthorized - User doesn't own this detection
 *       404:
 *         description: Detection not found
 * 
 *   delete:
 *     summary: Delete detection
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Detection ID
 *     responses:
 *       204:
 *         description: Detection deleted successfully
 *       404:
 *         description: Detection not found
 * 
 * /detections/{id}/image:
 *   put:
 *     summary: Update detection image
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Detection ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: New image file to replace the existing one
 *     responses:
 *       200:
 *         description: Image updated successfully
 *       404:
 *         description: Detection not found
 */

router.post('/', upload.single('file'), detectionController.createDetection);
router.get('/', isAdmin, detectionController.getAllDetections);
router.get('/user/:userId', detectionController.getDetectionsByUser);
router.get('/:id', detectionController.getDetectionById);
router.delete('/:id', detectionController.deleteDetection);
router.put('/:id', detectionController.updateDetection);
router.put('/:id/image', upload.single('file'), detectionController.updateDetectionImage);

export default router; 
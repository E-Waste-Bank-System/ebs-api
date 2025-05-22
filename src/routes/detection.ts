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
 *   description: AI-powered e-waste detection and analysis
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
 *           description: Unique identifier for the detection object
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user who created the detection
 *         scan_id:
 *           type: string
 *           format: uuid
 *           description: ID of the scan session this detection belongs to
 *         image_url:
 *           type: string
 *           format: uri
 *           description: Public URL of the detected image in Google Cloud Storage
 *         detection_source:
 *           type: string
 *           enum: [YOLO, 'Gemini Interfered']
 *           description: Source of the detection (AI model used)
 *         category:
 *           type: string
 *           description: Detected e-waste category (e.g., 'Keyboard', 'Television', 'Battery')
 *         confidence:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 1
 *           description: Confidence score of the detection (0-1)
 *         regression_result:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Estimated price from regression model (in IDR)
 *         description:
 *           type: string
 *           nullable: true
 *           description: AI-generated description of the item in Indonesian (10-40 words)
 *         suggestion:
 *           type: string
 *           nullable: true
 *           description: AI-generated suggestions for handling the e-waste (up to 3 points, joined by ' | ')
 *         risk_lvl:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           nullable: true
 *           description: AI-evaluated risk level of the e-waste (1-10)
 *         scans:
 *           type: object
 *           description: Related scan session information
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               description: Scan session ID
 *             user_id:
 *               type: string
 *               format: uuid
 *               description: User ID who created the scan
 *             status:
 *               type: string
 *               enum: [pending, processing, completed, failed]
 *               description: Status of the scan session
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the detection was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the detection was last updated
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         user_id: "d0ac0ecb-b4d7-4d81-bcd7-c0bcec391527"
 *         scan_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         image_url: "https://storage.googleapis.com/ebs-bucket/detection_123456.jpg"
 *         detection_source: "YOLO"
 *         category: "Keyboard"
 *         confidence: 0.95
 *         regression_result: 75000
 *         description: "Keyboard komputer hitam dengan tombol mekanik, kondisi masih baik namun kotor."
 *         suggestion: "Bersihkan dengan alkohol isopropil | Cek fungsi tombol sebelum daur ulang | Pisahkan komponen plastik dan logam"
 *         risk_lvl: 3
 *         created_at: "2023-06-01T12:00:00Z"
 *         updated_at: "2023-06-01T12:30:00Z"
 *     
 *     DetectionScanGroup:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Scan ID
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         scan_id:
 *           type: string
 *           format: uuid
 *           description: Same as id (for compatibility)
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *           description: Status of the scan
 *         prediction:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: Object ID
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: URL of the detected image
 *               category:
 *                 type: string
 *                 description: Category of the detected e-waste
 *               confidence:
 *                 type: number
 *                 format: float
 *                 description: Confidence score of the detection
 *               regression_result:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 description: Estimated price from regression model
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Detailed description of the detection
 *               suggestion:
 *                 type: string
 *                 nullable: true
 *                 description: Suggestions for handling the e-waste
 *               risk_lvl:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 nullable: true
 *                 description: Risk level of the e-waste
 *               detection_source:
 *                 type: string
 *                 nullable: true
 *                 description: Source of the detection
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the scan was created
 *       example:
 *         id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         user_id: "d0ac0ecb-b4d7-4d81-bcd7-c0bcec391527"
 *         scan_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         status: "completed"
 *         prediction: [
 *           {
 *             id: "550e8400-e29b-41d4-a716-446655440000",
 *             image_url: "https://storage.googleapis.com/ebs-bucket/detection_123456.jpg",
 *             category: "Keyboard",
 *             confidence: 0.95,
 *             regression_result: 75000,
 *             description: "Keyboard komputer hitam dengan tombol mekanik, kondisi masih baik namun kotor.",
 *             suggestion: "Bersihkan dengan alkohol isopropil | Cek fungsi tombol sebelum daur ulang | Pisahkan komponen plastik dan logam",
 *             risk_lvl: 3,
 *             detection_source: "YOLO"
 *           }
 *         ]
 *         created_at: "2023-06-01T12:00:00Z"
 */

/**
 * @swagger
 * /detections:
 *   post:
 *     summary: Create a new e-waste detection
 *     description: |
 *       Uploads an image for analysis, processes it with YOLO object detection model, 
 *       enriches with Gemini for description and suggestions, and estimates price with regression model.
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Detection created successfully"
 *                 scan_id:
 *                   type: string
 *                   format: uuid
 *                   description: ID of the created scan
 *                 predictions:
 *                   type: array
 *                   description: Array of detection results
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       category:
 *                         type: string
 *                       confidence:
 *                         type: number
 *                         format: float
 *                       regression_result:
 *                         type: number
 *                         nullable: true
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       suggestion:
 *                         type: array
 *                         items:
 *                           type: string
 *                       risk_lvl:
 *                         type: integer
 *                         nullable: true
 *                       detection_source:
 *                         type: string
 *                       image_url:
 *                         type: string
 *                         format: uri
 *                         description: URL of the uploaded and analyzed image
 *               example:
 *                 message: "Detection created successfully"
 *                 scan_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *                 predictions: [
 *                   {
 *                     id: "550e8400-e29b-41d4-a716-446655440000",
 *                     category: "Keyboard",
 *                     confidence: 0.95,
 *                     regression_result: 75000,
 *                     description: "Keyboard komputer hitam dengan tombol mekanik, kondisi masih baik namun kotor.",
 *                     suggestion: ["Bersihkan dengan alkohol isopropil", "Cek fungsi tombol sebelum daur ulang", "Pisahkan komponen plastik dan logam"],
 *                     risk_lvl: 3,
 *                     detection_source: "YOLO",
 *                     image_url: "https://storage.googleapis.com/ebs-bucket/detection_123456.jpg"
 *                   }
 *                 ]
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Server error during processing
 * 
 *   get:
 *     summary: Get all detections with filtering and pagination
 *     description: Admin-only endpoint to retrieve all detections with various filtering options
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
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
 *         description: Filter by specific category
 *       - in: query
 *         name: detection_source
 *         schema:
 *           type: string
 *           enum: [YOLO, 'Gemini Interfered']
 *         description: Filter by detection source
 *     responses:
 *       200:
 *         description: Paginated list of detections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Detection'
 *                 total:
 *                   type: integer
 *                   description: Total number of records
 *                 current_page:
 *                   type: integer
 *                   description: Current page number
 *                 last_page:
 *                   type: integer
 *                   description: Last page number
 *                 per_page:
 *                   type: integer
 *                   description: Number of items per page
 *       401:
 *         description: Unauthorized - valid token required
 *       403:
 *         description: Forbidden - admin access required
 * 
 * /detections/user/{userId}:
 *   get:
 *     summary: Get all detections for a specific user
 *     description: Retrieves all detections for a user, grouped by scan sessions
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID to get detections for
 *     responses:
 *       200:
 *         description: List of detections grouped by scan
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DetectionScanGroup'
 *       401:
 *         description: Unauthorized - valid token required
 *       404:
 *         description: No detections found for this user
 * 
 * /detections/{id}:
 *   get:
 *     summary: Get detection by ID
 *     description: Retrieves a single detection by its unique identifier
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Detection'
 *       401:
 *         description: Unauthorized - valid token required
 *       404:
 *         description: Detection not found
 * 
 *   put:
 *     summary: Update detection details
 *     description: Updates specific fields of a detection (requires ownership verification)
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
 *             example:
 *               description: "Keyboard mekanik dalam kondisi baik"
 *               suggestion: "Bersihkan dengan hati-hati | Pisahkan komponen elektronik | Daur ulang di pusat terdekat"
 *               category: "Keyboard"
 *               risk_lvl: 2
 *     responses:
 *       200:
 *         description: Detection updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Detection'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - valid token required
 *       403:
 *         description: Forbidden - user doesn't own this detection
 *       404:
 *         description: Detection not found
 * 
 *   delete:
 *     summary: Delete detection
 *     description: Permanently removes a detection record
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
 *       401:
 *         description: Unauthorized - valid token required
 *       404:
 *         description: Detection not found
 * 
 * /detections/{id}/image:
 *   put:
 *     summary: Update detection image
 *     description: Replaces the image for an existing detection
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Detection'
 *       400:
 *         description: Missing file or invalid request
 *       401:
 *         description: Unauthorized - valid token required
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
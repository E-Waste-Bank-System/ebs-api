import { Router } from 'express';
import isAuthenticated from '../middlewares/auth';
import upload from '../middlewares/upload';
import {
  createDetection,
  getDetectionsByUser,
  getDetectionsByScan,
  validateDetection,
  getAllDetections,
  deleteDetection
} from '../controllers/detectionController';
import validateQuery from '../middlewares/validateQuery';
import { z } from 'zod';

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
 *         - image_url
 *         - category
 *         - confidence
 *         - detection_source
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
 *           type: array
 *           items:
 *             type: string
 *           nullable: true
 *           description: AI-generated suggestions for handling the e-waste (up to 3 points)
 *         risk_lvl:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           nullable: true
 *           description: AI-evaluated risk level of the e-waste (1-10)
 *         is_validated:
 *           type: boolean
 *           description: Whether the detection has been validated by a user
 *         validated_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID of the user who validated the detection
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
 *         suggestion: ["Bersihkan dengan alkohol isopropil", "Cek fungsi tombol sebelum daur ulang", "Pisahkan komponen plastik dan logam"]
 *         risk_lvl: 3
 *         is_validated: false
 *         validated_by: null
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
 *                 type: array
 *                 items:
 *                   type: string
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
 *             suggestion: ["Bersihkan dengan alkohol isopropil", "Cek fungsi tombol sebelum daur ulang", "Pisahkan komponen plastik dan logam"],
 *             risk_lvl: 3,
 *             detection_source: "YOLO"
 *           }
 *         ]
 *         created_at: "2023-06-01T12:00:00Z"
 */

const detectionSchema = z.object({
  category: z.string().min(1),
  confidence: z.number().min(0).max(1),
  description: z.string().max(200).optional(),
  suggestion: z.array(z.string()).max(3).optional(),
  risk_lvl: z.number().min(1).max(10).optional(),
});

/**
 * @swagger
 * /detections:
 *   post:
 *     summary: Create a new detection
 *     description: Upload an image and create a new detection with AI analysis
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to analyze
 *     responses:
 *       201:
 *         description: Detection created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Detection'
 *                 message:
 *                   type: string
 *       400:
 *         description: No image file provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', isAuthenticated, upload.single('image'), createDetection);

/**
 * @swagger
 * /detections/user:
 *   get:
 *     summary: Get detections by user
 *     description: Retrieve all detections for the authenticated user
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: is_validated
 *         schema:
 *           type: boolean
 *         description: Filter by validation status
 *     responses:
 *       200:
 *         description: List of detections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DetectionScanGroup'
 *                 total:
 *                   type: integer
 *                   description: Total number of detections
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/user', isAuthenticated, getDetectionsByUser);

/**
 * @swagger
 * /detections/scan/{scanId}:
 *   get:
 *     summary: Get detections by scan ID
 *     description: Retrieve all detections for a specific scan session
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Scan ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: is_validated
 *         schema:
 *           type: boolean
 *         description: Filter by validation status
 *     responses:
 *       200:
 *         description: List of detections for the scan
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
 *                   description: Total number of detections
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Scan not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/scan/:scanId', isAuthenticated, getDetectionsByScan);

/**
 * @swagger
 * /detections/{objectId}/validate:
 *   post:
 *     summary: Validate a detection
 *     description: Validate or update a detection's category and confidence
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Object ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 description: Corrected category
 *               confidence:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Updated confidence score
 *     responses:
 *       200:
 *         description: Detection validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Detection'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid validation data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Detection not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:objectId/validate', isAuthenticated, validateDetection);

/**
 * @swagger
 * /detections/{id}:
 *   delete:
 *     summary: Delete a detection
 *     description: Delete a specific detection by its ID
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
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Detection not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', isAuthenticated, deleteDetection);

/**
 * @swagger
 * /detections:
 *   get:
 *     summary: Get all detections
 *     description: Retrieve all detections with pagination and filters
 *     tags: [Detections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DetectionScanGroup'
 *                 total:
 *                   type: integer
 *                   description: Total number of detections
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', isAuthenticated, getAllDetections);

// Unique categories endpoint
router.get('/categories', async (req, res, next) => {
  try {
    const { data, error } = await require('../utils/supabase').default
      .from('objects')
      .select('category')
      .neq('category', null);
    if (error) throw error;
    const categories = Array.from(new Set(data.map((obj: { category: string }) => obj.category))).sort();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

export default router; 
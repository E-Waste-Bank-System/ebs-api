import { Router } from 'express';
import { getAllDetections, getDetectionsByUser, getDetectionById } from '../controllers/detectionController';
import { isAuthenticated } from '../middlewares/role';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Scans
 *   description: Scan and object detection management
 */

/**
 * @swagger
 * /scans:
 *   get:
 *     summary: Get all scans with their objects
 *     description: Retrieves a paginated list of scans with their associated objects
 *     tags: [Scans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
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
 *         description: Search term for filtering
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by object category
 *       - in: query
 *         name: detection_source
 *         schema:
 *           type: string
 *         description: Filter by detection source
 *     responses:
 *       200:
 *         description: List of scans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                       status:
 *                         type: string
 *                         enum: [pending, processing, completed, failed]
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       objects:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             category:
 *                               type: string
 *                             confidence:
 *                               type: number
 *                             image_url:
 *                               type: string
 *                 total:
 *                   type: integer
 *                 current_page:
 *                   type: integer
 *                 last_page:
 *                   type: integer
 *                 per_page:
 *                   type: integer
 *       401:
 *         description: Unauthorized - valid token required
 *       500:
 *         description: Server error while retrieving scans
 */

router.get('/', isAuthenticated, getAllDetections);

/**
 * @swagger
 * /scans/user/{userId}:
 *   get:
 *     summary: Get scans for a specific user
 *     description: Retrieves all scans and their objects for a specific user
 *     tags: [Scans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID to get scans for
 *     responses:
 *       200:
 *         description: User's scans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   user_id:
 *                     type: string
 *                     format: uuid
 *                   status:
 *                     type: string
 *                     enum: [pending, processing, completed, failed]
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   objects:
 *                     type: array
 *                     items:
 *                       type: object
 *       401:
 *         description: Unauthorized - valid token required
 *       500:
 *         description: Server error while retrieving user's scans
 */

router.get('/user/:userId', isAuthenticated, getDetectionsByUser);

/**
 * @swagger
 * /scans/{id}:
 *   get:
 *     summary: Get a specific object detection
 *     description: Retrieves details of a specific object detection
 *     tags: [Scans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Object detection ID
 *     responses:
 *       200:
 *         description: Object detection retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 category:
 *                   type: string
 *                 confidence:
 *                   type: number
 *                 image_url:
 *                   type: string
 *                 scan:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized - valid token required
 *       404:
 *         description: Object detection not found
 *       500:
 *         description: Server error while retrieving object detection
 */

router.get('/:id', isAuthenticated, getDetectionById);

export default router; 
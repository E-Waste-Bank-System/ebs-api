import { Router } from 'express';
import { isAuthenticated } from '../middlewares/role';
import * as retrainingController from '../controllers/retrainingController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Retraining
 *   description: Model retraining data management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BboxCoordinates:
 *       type: object
 *       required:
 *         - x
 *         - y
 *         - width
 *         - height
 *       properties:
 *         x:
 *           type: number
 *           description: X coordinate of the bounding box
 *         y:
 *           type: number
 *           description: Y coordinate of the bounding box
 *         width:
 *           type: number
 *           description: Width of the bounding box
 *         height:
 *           type: number
 *           description: Height of the bounding box
 *     RetrainingData:
 *       type: object
 *       description: |
 *         Model retraining data entry. This system captures prediction data and allows for human verification/correction.
 *         It automatically integrates with the validation system - any user feedback from validations will update 
 *         the corresponding retraining entries, ensuring a consistent feedback loop for model improvement.
 *       required:
 *         - id
 *         - image_url
 *         - original_category
 *         - bbox_coordinates
 *         - confidence_score
 *         - is_verified
 *         - model_version
 *         - user_id
 *         - object_id
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the retraining data
 *         image_url:
 *           type: string
 *           description: URL of the image
 *         original_category:
 *           type: string
 *           description: Original category predicted by the model
 *         bbox_coordinates:
 *           $ref: '#/components/schemas/BboxCoordinates'
 *         confidence_score:
 *           type: number
 *           format: float
 *           description: Confidence score of the original prediction
 *         corrected_category:
 *           type: string
 *           nullable: true
 *           description: Corrected category by human verification (automatically updated from validations)
 *         is_verified:
 *           type: boolean
 *           description: Whether this data point has been verified by a human
 *         model_version:
 *           type: string
 *           description: Version of the model that made the prediction
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user associated with this data
 *         object_id:
 *           type: string
 *           format: uuid
 *           description: ID of the related detection (required for linking validations and retraining data)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the data was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when the data was last updated
 */

/**
 * @swagger
 * /retraining:
 *   post:
 *     summary: Create a new retraining data entry
 *     description: Add a new entry to the retraining dataset
 *     tags: [Retraining]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image_url
 *               - original_category
 *               - bbox_coordinates
 *               - confidence_score
 *               - model_version
 *               - user_id
 *               - object_id
 *             properties:
 *               image_url:
 *                 type: string
 *                 description: URL of the image
 *               original_category:
 *                 type: string
 *                 description: Original category predicted by the model
 *               bbox_coordinates:
 *                 $ref: '#/components/schemas/BboxCoordinates'
 *               confidence_score:
 *                 type: number
 *                 format: float
 *                 description: Confidence score of the original prediction
 *               model_version:
 *                 type: string
 *                 description: Version of the model that made the prediction
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user associated with this data
 *               object_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the related detection (required for linking validations and retraining data)
 *     responses:
 *       201:
 *         description: Retraining data entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RetrainingData'
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized - valid token required
 */
router.post('/', isAuthenticated, retrainingController.createRetrainingEntry);

/**
 * @swagger
 * /retraining:
 *   get:
 *     summary: Get all retraining data with pagination and filters
 *     description: Retrieve all retraining data entries with optional filtering
 *     tags: [Retraining]
 *     security: [ { bearerAuth: [] } ]
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
 *         name: is_verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: model_version
 *         schema:
 *           type: string
 *         description: Filter by model version
 *       - in: query
 *         name: confidence_below
 *         schema:
 *           type: number
 *         description: Filter by confidence score below this value
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by original category
 *     responses:
 *       200:
 *         description: List of retraining data entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RetrainingData'
 *                 total:
 *                   type: integer
 *                   description: Total number of items
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
 */
router.get('/', isAuthenticated, retrainingController.getAllRetrainingData);

/**
 * @swagger
 * /retraining/unverified/samples:
 *   get:
 *     summary: Get unverified samples for review
 *     description: Retrieve samples that need human verification, sorted by lowest confidence first
 *     tags: [Retraining]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of samples to retrieve
 *     responses:
 *       200:
 *         description: List of unverified samples
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RetrainingData'
 *       401:
 *         description: Unauthorized - valid token required
 */
router.get('/unverified/samples', isAuthenticated, retrainingController.getUnverifiedSamples);

/**
 * @swagger
 * /retraining/export/data:
 *   get:
 *     summary: Export verified data for model retraining
 *     description: Export all verified data for use in model retraining
 *     tags: [Retraining]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Verified data for retraining
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RetrainingData'
 *       401:
 *         description: Unauthorized - valid token required
 */
router.get('/export/data', isAuthenticated, retrainingController.exportVerifiedData);

/**
 * @swagger
 * /retraining/{id}:
 *   get:
 *     summary: Get a retraining data entry by ID
 *     description: Retrieve a specific retraining data entry
 *     tags: [Retraining]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the retraining data entry
 *     responses:
 *       200:
 *         description: Retraining data entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RetrainingData'
 *       404:
 *         description: Retraining data not found
 *       401:
 *         description: Unauthorized - valid token required
 */
router.get('/:id', isAuthenticated, retrainingController.getRetrainingDataById);

/**
 * @swagger
 * /retraining/object/{object_id}:
 *   get:
 *     summary: Get retraining data by object ID
 *     description: Retrieve retraining data for a specific object/detection
 *     tags: [Retraining]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: object_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the object/detection
 *     responses:
 *       200:
 *         description: Retraining data entry for the object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RetrainingData'
 *       404:
 *         description: No retraining data found for this object
 *       401:
 *         description: Unauthorized - valid token required
 */
router.get('/object/:object_id', isAuthenticated, retrainingController.getRetrainingDataByObjectId);

/**
 * @swagger
 * /retraining/{id}:
 *   put:
 *     summary: Update a retraining data entry
 *     description: Update a specific retraining data entry
 *     tags: [Retraining]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the retraining data entry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bbox_coordinates:
 *                 $ref: '#/components/schemas/BboxCoordinates'
 *               original_category:
 *                 type: string
 *               corrected_category:
 *                 type: string
 *               is_verified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Retraining data updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RetrainingData'
 *       404:
 *         description: Retraining data not found
 *       401:
 *         description: Unauthorized - valid token required
 */
router.put('/:id', isAuthenticated, retrainingController.updateRetrainingData);

/**
 * @swagger
 * /retraining/{id}/verify:
 *   post:
 *     summary: Verify a retraining data entry
 *     description: Mark a retraining data entry as verified and provide the corrected category
 *     tags: [Retraining]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the retraining data entry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - corrected_category
 *             properties:
 *               corrected_category:
 *                 type: string
 *                 description: The corrected category for this data
 *     responses:
 *       200:
 *         description: Retraining data verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RetrainingData'
 *       400:
 *         description: Bad request - corrected category is required
 *       404:
 *         description: Retraining data not found
 *       401:
 *         description: Unauthorized - valid token required
 */
router.post('/:id/verify', isAuthenticated, retrainingController.verifyRetrainingData);

/**
 * @swagger
 * /retraining/{id}:
 *   delete:
 *     summary: Delete a retraining data entry
 *     description: Delete a specific retraining data entry
 *     tags: [Retraining]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the retraining data entry
 *     responses:
 *       204:
 *         description: Retraining data deleted successfully
 *       404:
 *         description: Retraining data not found
 *       401:
 *         description: Unauthorized - valid token required
 */
router.delete('/:id', isAuthenticated, retrainingController.deleteRetrainingData);

export default router;
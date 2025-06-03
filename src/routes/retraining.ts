import { Router } from 'express';
import { isAuthenticated } from '../middlewares/role';
import * as retrainingController from '../controllers/retrainingController';
import validateQuery from '../middlewares/validateQuery';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Retraining
 *   description: Model retraining data management and validation
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
 *       required:
 *         - id
 *         - user_id
 *         - object_id
 *         - image_url
 *         - original_category
 *         - bbox_coordinates
 *         - confidence_score
 *         - corrected_category
 *         - corrected_price
 *         - is_verified
 *         - model_version
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the retraining data
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user who created the entry
 *         object_id:
 *           type: string
 *           format: uuid
 *           description: ID of the detected object
 *         image_url:
 *           type: string
 *           format: uri
 *           description: URL of the image in storage
 *         original_category:
 *           type: string
 *           description: Original category predicted by the model
 *         bbox_coordinates:
 *           type: object
 *           description: Bounding box coordinates of the detection
 *           properties:
 *             x:
 *               type: number
 *               format: float
 *             y:
 *               type: number
 *               format: float
 *             width:
 *               type: number
 *               format: float
 *             height:
 *               type: number
 *               format: float
 *         confidence_score:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 1
 *           description: Confidence score of the original prediction
 *         corrected_category:
 *           type: string
 *           description: Corrected category after validation
 *         corrected_price:
 *           type: number
 *           format: float
 *           description: Corrected price after validation
 *         is_verified:
 *           type: boolean
 *           description: Whether the entry has been verified
 *         verified_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID of the user who verified the entry
 *         model_version:
 *           type: string
 *           description: Version of the model used for detection
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the entry was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the entry was last updated
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         user_id: "d0ac0ecb-b4d7-4d81-bcd7-c0bcec391527"
 *         object_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         image_url: "https://storage.googleapis.com/ebs-bucket/retraining_123456.jpg"
 *         original_category: "Keyboard"
 *         bbox_coordinates: {
 *           x: 0.1,
 *           y: 0.2,
 *           width: 0.3,
 *           height: 0.4
 *         }
 *         confidence_score: 0.95
 *         corrected_category: "Mechanical Keyboard"
 *         corrected_price: 75000
 *         is_verified: true
 *         verified_by: "d0ac0ecb-b4d7-4d81-bcd7-c0bcec391527"
 *         model_version: "v1.0.0"
 *         created_at: "2023-06-01T12:00:00Z"
 *         updated_at: "2023-06-01T12:30:00Z"
 */

const retrainingSchema = z.object({
  image_url: z.string().url(),
  original_category: z.string().min(1),
  bbox_coordinates: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  confidence_score: z.number().min(0).max(1),
  model_version: z.string().min(1),
  user_id: z.string().uuid(),
  object_id: z.string().uuid(),
});

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  is_verified: z.string().transform(val => val === 'true').optional(),
  model_version: z.string().optional(),
  confidence_below: z.string().transform(Number).optional(),
  category: z.string().optional(),
});

/**
 * @swagger
 * /retraining:
 *   post:
 *     summary: Create a new retraining data entry
 *     description: Create a new entry for model retraining data
 *     tags: [Retraining]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - object_id
 *               - image_url
 *               - original_category
 *               - bbox_coordinates
 *               - confidence_score
 *               - corrected_category
 *               - corrected_price
 *               - model_version
 *             properties:
 *               object_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the detected object
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: URL of the image in storage
 *               original_category:
 *                 type: string
 *                 description: Original category predicted by the model
 *               bbox_coordinates:
 *                 type: object
 *                 description: Bounding box coordinates of the detection
 *                 properties:
 *                   x:
 *                     type: number
 *                     format: float
 *                   y:
 *                     type: number
 *                     format: float
 *                   width:
 *                     type: number
 *                     format: float
 *                   height:
 *                     type: number
 *                     format: float
 *               confidence_score:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Confidence score of the original prediction
 *               corrected_category:
 *                 type: string
 *                 description: Corrected category after validation
 *               corrected_price:
 *                 type: number
 *                 format: float
 *                 description: Corrected price after validation
 *               model_version:
 *                 type: string
 *                 description: Version of the model used for detection
 *     responses:
 *       201:
 *         description: Retraining data entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RetrainingData'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request data
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
router.post('/', isAuthenticated, validateQuery(retrainingSchema), retrainingController.createRetrainingEntry);

/**
 * @swagger
 * /retraining:
 *   get:
 *     summary: Get retraining data entries
 *     description: Retrieve paginated list of retraining data entries
 *     tags: [Retraining]
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
 *         name: is_verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: model_version
 *         schema:
 *           type: string
 *         description: Filter by model version
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
 *                   description: Total number of entries
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
router.get('/', isAuthenticated, validateQuery(querySchema), retrainingController.getAllRetrainingData);

/**
 * @swagger
 * /retraining/unverified/samples:
 *   get:
 *     summary: Get unverified samples for review
 *     description: Retrieve samples that need human verification, sorted by lowest confidence first
 *     tags: [Retraining]
 *     security:
 *       - bearerAuth: []
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
router.get('/unverified/samples', isAuthenticated, retrainingController.getUnverifiedSamples);

/**
 * @swagger
 * /retraining/export/data:
 *   get:
 *     summary: Export verified data for model retraining
 *     description: Export all verified data for use in model retraining
 *     tags: [Retraining]
 *     security:
 *       - bearerAuth: []
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
router.get('/export/data', isAuthenticated, retrainingController.exportVerifiedData);

/**
 * @swagger
 * /retraining/{id}:
 *   get:
 *     summary: Get retraining data entry by ID
 *     description: Retrieve a specific retraining data entry by its ID
 *     tags: [Retraining]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Retraining data entry ID
 *     responses:
 *       200:
 *         description: Retraining data entry details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RetrainingData'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Entry not found
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
router.get('/:id', isAuthenticated, retrainingController.getRetrainingDataById);

/**
 * @swagger
 * /retraining/object/{object_id}:
 *   get:
 *     summary: Get retraining data by object ID
 *     description: Retrieve retraining data for a specific object/detection
 *     tags: [Retraining]
 *     security:
 *       - bearerAuth: []
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
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RetrainingData'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No retraining data found for this object
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
router.get('/object/:object_id', isAuthenticated, retrainingController.getRetrainingDataByObjectId);

/**
 * @swagger
 * /retraining/{id}:
 *   put:
 *     summary: Update a retraining data entry
 *     description: Update a specific retraining data entry
 *     tags: [Retraining]
 *     security:
 *       - bearerAuth: []
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
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RetrainingData'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid update data
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
 *         description: Entry not found
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
router.put('/:id', isAuthenticated, validateQuery(retrainingSchema), retrainingController.updateRetrainingData);

/**
 * @swagger
 * /retraining/{id}/verify:
 *   post:
 *     summary: Verify a retraining data entry
 *     description: Mark a retraining data entry as verified
 *     tags: [Retraining]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Retraining data entry ID
 *     responses:
 *       200:
 *         description: Entry verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RetrainingData'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Entry not found
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
router.post('/:id/verify', isAuthenticated, retrainingController.verifyRetrainingData);

/**
 * @swagger
 * /retraining/{id}:
 *   delete:
 *     summary: Delete a retraining data entry
 *     description: Delete a specific retraining data entry
 *     tags: [Retraining]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Entry not found
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
router.delete('/:id', isAuthenticated, retrainingController.deleteRetrainingData);

export default router;
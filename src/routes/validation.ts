import { Router } from 'express';
import { isAuthenticated } from '../middlewares/role';
import * as validationController from '../controllers/validationController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Validations
 *   description: User feedback on e-waste detection accuracy (integrated with model retraining)
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Validation:
 *       type: object
 *       required:
 *         - id
 *         - detection_id
 *         - user_id
 *         - is_accurate
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the validation feedback
 *         detection_id:
 *           type: string
 *           format: uuid
 *           description: ID of the detection being validated
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user providing the validation feedback
 *         is_accurate:
 *           type: boolean
 *           description: Whether the user considers the detection accurate
 *         feedback:
 *           type: string
 *           nullable: true
 *           description: Additional textual feedback about the detection
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the validation was submitted
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         detection_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         user_id: "d0ac0ecb-b4d7-4d81-bcd7-c0bcec391527"
 *         is_accurate: true
 *         feedback: "Deteksi sangat akurat, keyboard terdeteksi dengan benar."
 *         created_at: "2023-06-01T12:00:00Z"
 */
/**
 * @swagger
 * /validations:
 *   post:
 *     summary: Submit validation feedback
 *     description: |
 *       Allow users to provide feedback on detection accuracy to improve the AI model.
 *       This automatically updates the retraining dataset to help improve model accuracy over time.
 *       If the detection is marked inaccurate, the feedback will be used as the corrected category.
 *       
 *       Integration details:
 *       - For existing retraining data: Updates is_verified=true and sets corrected_category if feedback provided
 *       - For missing retraining data: Creates a new retraining entry with the validation information
 *       - Validations marked accurate: Sets the original category as the corrected category
 *       - Validations marked inaccurate: Uses the feedback text as the corrected category
 *     tags: [Validations]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - detection_id
 *               - is_accurate
 *             properties:
 *               detection_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the detection being validated
 *               is_accurate:
 *                 type: boolean
 *                 description: Whether the detection was accurate
 *               feedback:
 *                 type: string
 *                 description: Additional feedback about the detection (optional); if is_accurate=false, this should contain the correct category name
 *             example:
 *               detection_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *               is_accurate: true
 *               feedback: "Kategori dan deskripsi sesuai dengan barang elektronik saya."
 *     responses:
 *       201:
 *         description: Validation feedback submitted successfully and retraining data updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Validation'
 *       400:
 *         description: Bad request - missing required fields or invalid data
 *       401:
 *         description: Unauthorized - valid token required
 *       404:
 *         description: Detection not found
 *       409:
 *         description: Validation already exists for this user and detection
 */
router.post('/', isAuthenticated, validationController.createValidation);
/**
 * @swagger
 * /validations:
 *   get:
 *     summary: Get all validations
 *     description: Retrieve all validation feedback (requires authentication)
 *     tags: [Validations]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of validation feedback entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Validation'
 *       401:
 *         description: Unauthorized - valid token required
 */
router.get('/', isAuthenticated, validationController.getAllValidations);

export default router; 
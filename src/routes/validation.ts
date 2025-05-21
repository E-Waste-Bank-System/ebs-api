import { Router } from 'express';
import { isAuthenticated } from '../middlewares/role';
import * as validationController from '../controllers/validationController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Validations
 *   description: Validation feedback endpoints
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
 *           description: Unique identifier for the validation
 *         detection_id:
 *           type: string
 *           format: uuid
 *           description: ID of the detection being validated
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user providing the validation
 *         is_accurate:
 *           type: boolean
 *           description: Whether the detection was accurate
 *         feedback:
 *           type: string
 *           nullable: true
 *           description: Additional feedback about the detection
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the validation was created
 */
/**
 * @swagger
 * /validations:
 *   post:
 *     summary: Submit validation feedback for a detection
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
 *                 description: Additional feedback about the detection
 *     responses:
 *       201:
 *         description: Validation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Validation'
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post('/', isAuthenticated, validationController.createValidation);
/**
 * @swagger
 * /validations:
 *   get:
 *     summary: Get all validations
 *     tags: [Validations]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of validations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Validation'
 *       401:
 *         description: Unauthorized
 */
router.get('/', isAuthenticated, validationController.getAllValidations);

export default router; 
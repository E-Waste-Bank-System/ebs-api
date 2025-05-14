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
 *       properties:
 *         id:
 *           type: string
 *         detection_id:
 *           type: string
 *         user_id:
 *           type: string
 *         is_accurate:
 *           type: boolean
 *         feedback:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
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
 *             properties:
 *               detection_id:
 *                 type: string
 *               is_accurate:
 *                 type: boolean
 *               feedback:
 *                 type: string
 *     responses:
 *       201:
 *         description: Validation created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Validation'
 *       400:
 *         description: Invalid input
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
 */
router.get('/', isAuthenticated, validationController.getAllValidations);

export default router; 
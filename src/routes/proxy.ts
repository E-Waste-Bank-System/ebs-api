import { Router } from 'express';
import requireAuth from '../middlewares/auth';
import upload from '../middlewares/upload';
import { inferYOLO, estimateRegression } from '../controllers/proxyController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Proxy
 *   description: AI-powered endpoints (image inference, price regression)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     YOLOResponse:
 *       type: object
 *       properties:
 *         class:
 *           type: string
 *         confidence:
 *           type: number
 *         bbox:
 *           type: array
 *           items:
 *             type: number
 *     RegressionRequest:
 *       type: object
 *       properties:
 *         features:
 *           type: object
 *     RegressionResponse:
 *       type: object
 *       properties:
 *         price:
 *           type: number
 */

/**
 * @swagger
 * /proxy/yolo:
 *   post:
 *     summary: Run YOLO image inference
 *     tags: [Proxy]
 *     security: [ { bearerAuth: [] } ]
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
 *     responses:
 *       200:
 *         description: Inference result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/YOLOResponse'
 *       400:
 *         description: Image file is required
 */

/**
 * @swagger
 * /proxy/regression:
 *   post:
 *     summary: Run price regression estimation
 *     tags: [Proxy]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegressionRequest'
 *     responses:
 *       200:
 *         description: Regression result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegressionResponse'
 *       400:
 *         description: Invalid input
 */

router.post('/yolo', requireAuth, upload.single('image'), inferYOLO);
router.post('/regression', requireAuth, estimateRegression);

export default router;
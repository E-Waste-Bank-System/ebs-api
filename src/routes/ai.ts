import { Router } from 'express';
import { z } from 'zod';
import requireAuth from '../middlewares/auth';
import upload from '../middlewares/upload';
import validate from '../middlewares/validate';
import { inference, estimatePrice } from '../controllers/aiController';

const router = Router();

const estimateSchema = z.object({
  category: z.string().min(1),
  weight: z.number().positive(),
});

/**
 * @openapi
 * /api/inference:
 *   post:
 *     tags:
 *       - AI
 *     summary: Run AI inference on an uploaded image
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
 *             required: [image]
 *     responses:
 *       200:
 *         description: Inference result data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InferenceResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/inference', requireAuth, upload.single('image'), inference);

/**
 * @openapi
 * /api/estimate-price:
 *   post:
 *     tags:
 *       - AI
 *     summary: Estimate price based on category and weight via regression service
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *               weight:
 *                 type: number
 *             required: [category, weight]
 *     responses:
 *       200:
 *         description: Estimated price result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EstimateResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/estimate-price', requireAuth, validate(estimateSchema), estimatePrice);

export default router;
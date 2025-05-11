import { Router } from 'express';
import upload from '../middlewares/upload';
import { isAuthenticated, isAdmin } from '../middlewares/role';
import * as detectionController from '../controllers/detectionController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Detections
 *   description: E-waste detection endpoints
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Detection:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         user_id:
 *           type: string
 *         image_url:
 *           type: string
 *         label:
 *           type: string
 *         confidence:
 *           type: number
 *         regression_result:
 *           type: number
 *         created_at:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /detections:
 *   post:
 *     summary: Upload e-waste image, run detection, and save result
 *     tags: [Detections]
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
 *       201:
 *         description: Detection result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Detection'
 *       400:
 *         description: Image file is required
 *   get:
 *     summary: Get all detections (admin only)
 *     tags: [Detections]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of detections
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Detection'
 *
 * /detections/user/{userId}:
 *   get:
 *     summary: Get detections for a user
 *     tags: [Detections]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user detections
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Detection'
 *
 * /detections/{id}:
 *   get:
 *     summary: Get detection by ID
 *     tags: [Detections]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detection found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Detection'
 *       404:
 *         description: Detection not found
 *   delete:
 *     summary: Delete a detection
 *     tags: [Detections]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Detection deleted
 *       404:
 *         description: Detection not found
 */
router.post('/', isAuthenticated, upload.single('image'), detectionController.createDetection);
router.get('/', isAdmin, detectionController.getAllDetections);
router.get('/user/:userId', isAuthenticated, detectionController.getDetectionsByUser);
router.get('/:id', isAuthenticated, detectionController.getDetectionById);
router.delete('/:id', isAuthenticated, detectionController.deleteDetection);

export default router; 
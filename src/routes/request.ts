import { Router } from 'express';
import { z } from 'zod';
import validate from '../middlewares/validate';
import validateQuery from '../middlewares/validateQuery';
import requireAuth from '../middlewares/auth';
import upload from '../middlewares/upload';
import {
  getAllRequests,
  approveRequest,
  rejectRequest,
  createRequest,
  getUserRequests,
} from '../controllers/requestController';

const router = Router();

const querySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const createSchema = z.object({
  description: z.string().min(1)
});

/**
 * @swagger
 * tags:
 *   name: Requests
 *   description: E-waste request management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EWasteRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         user_id:
 *           type: string
 *         description:
 *           type: string
 *         image_url:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         created_at:
 *           type: string
 *           format: date-time
 *     EWasteRequestCreate:
 *       type: object
 *       required:
 *         - description
 *       properties:
 *         description:
 *           type: string
 *         image:
 *           type: string
 *           format: binary
 */

/**
 * @swagger
 * /requests:
 *   get:
 *     summary: Get all e-waste requests (admin)
 *     tags: [Requests]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: false
 *     responses:
 *       200:
 *         description: List of requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EWasteRequest'
 *                 total:
 *                   type: integer
 */

/**
 * @swagger
 * /requests/{id}/approve:
 *   post:
 *     summary: Approve a request (admin)
 *     tags: [Requests]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EWasteRequest'
 *       404:
 *         description: Request not found
 */

/**
 * @swagger
 * /requests/{id}/reject:
 *   post:
 *     summary: Reject a request (admin)
 *     tags: [Requests]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EWasteRequest'
 *       404:
 *         description: Request not found
 */

/**
 * @swagger
 * /requests:
 *   post:
 *     summary: Create a new e-waste request (user)
 *     tags: [Requests]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/EWasteRequestCreate'
 *     responses:
 *       201:
 *         description: Request created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EWasteRequest'
 *       400:
 *         description: Invalid input
 */

/**
 * @swagger
 * /requests/me:
 *   get:
 *     summary: Get requests for the current user
 *     tags: [Requests]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of user requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EWasteRequest'
 */

// Admin endpoints
router.get('/', requireAuth, validateQuery(querySchema), getAllRequests);
router.post('/:id/approve', requireAuth, approveRequest);
router.post('/:id/reject', requireAuth, rejectRequest);

// User endpoints
router.post('/', requireAuth, upload.single('image'), validate(createSchema), createRequest);
router.get('/me', requireAuth, getUserRequests);

export default router;
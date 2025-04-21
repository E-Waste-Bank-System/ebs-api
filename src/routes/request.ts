import { Router } from 'express';
import { z } from 'zod';
import validate from '../middlewares/validate';
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

// Admin routes
/**
 * @openapi
 * /api/requests:
 *   get:
 *     tags:
 *       - Requests
 *     summary: Retrieve a paginated list of e-waste requests (Admin)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of requests to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of requests to skip
 *     responses:
 *       200:
 *         description: List of requests with total count
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
router.get('/', requireAuth, getAllRequests);

/**
 * @openapi
 * /api/requests/{id}/approve:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Approve an e-waste request (Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Request approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EWasteRequest'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/approve', requireAuth, approveRequest);

/**
 * @openapi
 * /api/requests/{id}/reject:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Reject an e-waste request (Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Request rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EWasteRequest'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/reject', requireAuth, rejectRequest);

// User routes
const userCreateSchema = z.object({
  weight: z.preprocess((val) => parseFloat(val as string), z.number().positive()),
  location: z.string().min(1),
  pickupDate: z.string().optional(),
});

/**
 * @openapi
 * /api/requests:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Submit a new e-waste request
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *               location:
 *                 type: string
 *               pickupDate:
 *                 type: string
 *                 format: date-time
 *               image:
 *                 type: string
 *                 format: binary
 *             required: [weight, location, image]
 *     responses:
 *       201:
 *         description: Request created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EWasteRequest'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', requireAuth, upload.single('image'), validate(userCreateSchema), createRequest);

/**
 * @openapi
 * /api/requests/me:
 *   get:
 *     tags:
 *       - Requests
 *     summary: Retrieve current user's e-waste request history
 *     responses:
 *       200:
 *         description: Array of user's requests
 */
router.get('/me', requireAuth, getUserRequests);

export default router;
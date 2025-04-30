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
  weight: z.coerce.number().positive(),
  location: z.string().min(1),
  pickupDate: z.string().optional(),
});

// Admin endpoints
router.get('/', requireAuth, validateQuery(querySchema), getAllRequests);
router.post('/:id/approve', requireAuth, approveRequest);
router.post('/:id/reject', requireAuth, rejectRequest);

// User endpoints
router.post('/', requireAuth, upload.single('image'), validate(createSchema), createRequest);
router.get('/me', requireAuth, getUserRequests);

export default router;
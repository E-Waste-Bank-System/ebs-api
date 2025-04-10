import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  getDashboardStats,
  getUsers,
  blockUser,
  getPendingEwaste,
  approveEwaste,
  rejectEwaste,
  getTransactions,
  updatePricing
} from '../controllers/admin.controller';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.patch('/users/:id/block', blockUser);
router.get('/ewaste/pending', getPendingEwaste);
router.patch('/ewaste/:id/approve', approveEwaste);
router.patch('/ewaste/:id/reject', rejectEwaste);
router.get('/transactions', getTransactions);
router.put('/pricing', updatePricing);

export default router; 
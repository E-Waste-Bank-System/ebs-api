import { Router } from 'express';
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
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate, authorizeAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.patch('/users/:id/block', blockUser);
router.get('/ewaste-pending', getPendingEwaste);
router.patch('/ewaste/:id/approve', approveEwaste);
router.patch('/ewaste/:id/reject', rejectEwaste);
router.get('/transactions', getTransactions);
router.post('/pricing', updatePricing);

export default router; 
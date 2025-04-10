import { Router } from 'express';
import {
  getDashboardStats,
  getUsers,
  blockUser,
  getPendingEwaste,
  approveEwaste,
  rejectEwaste,
  getTransactions,
  setPricing
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['ADMIN']));

// Dashboard routes
router.get('/dashboard', getDashboardStats);

// User management routes
router.get('/users', getUsers);
router.patch('/users/:id/block', blockUser);

// E-waste management routes
router.get('/ewaste-pending', getPendingEwaste);
router.patch('/ewaste/:id/approve', approveEwaste);
router.patch('/ewaste/:id/reject', rejectEwaste);

// Transaction routes
router.get('/transactions', getTransactions);

// Pricing routes
router.post('/pricing', setPricing);

export default router; 
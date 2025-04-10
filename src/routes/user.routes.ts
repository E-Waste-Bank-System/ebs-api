import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadEwaste,
  getTransactions,
  getSchedules,
  updateSchedule
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadFile } from '../middlewares/upload.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize(['USER']));

// User profile routes
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);

// E-waste routes
router.post('/ewaste', ...uploadFile('image'), uploadEwaste);

// Transaction routes
router.get('/transactions', getTransactions);

// Schedule routes
router.get('/schedules', getSchedules);
router.patch('/schedule/:id', updateSchedule);

export default router; 
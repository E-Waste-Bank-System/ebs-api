import { Router } from 'express';
import {
  getAllContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent
} from '../controllers/content.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllContent);
router.get('/:id', getContentById);

// Admin routes
router.post('/', authenticate, authorize(['ADMIN']), createContent);
router.put('/:id', authenticate, authorize(['ADMIN']), updateContent);
router.delete('/:id', authenticate, authorize(['ADMIN']), deleteContent);

export default router; 
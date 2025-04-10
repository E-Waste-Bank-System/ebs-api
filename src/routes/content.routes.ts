import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  getContents,
  getContent,
  createContent,
  updateContent,
  deleteContent
} from '../controllers/content.controller';

const router = Router();

// Public routes
router.get('/', getContents);
router.get('/:id', getContent);

// Admin routes
router.post('/', authenticate, authorize(['ADMIN']), createContent);
router.put('/:id', authenticate, authorize(['ADMIN']), updateContent);
router.delete('/:id', authenticate, authorize(['ADMIN']), deleteContent);

export default router; 
import { Router } from 'express';
import {
  getContents,
  getContent,
  createContent,
  updateContent,
  deleteContent
} from '../controllers/content.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/', getContents);
router.get('/:id', getContent);

// Admin routes
router.use(authenticate, authorizeAdmin);
router.post('/', createContent);
router.put('/:id', updateContent);
router.delete('/:id', deleteContent);

export default router; 
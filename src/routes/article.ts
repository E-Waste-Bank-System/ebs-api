import { Router } from 'express';
import { z } from 'zod';
import validate from '../middlewares/validate';
import validateQuery from '../middlewares/validateQuery';
import requireAuth from '../middlewares/auth';
import upload from '../middlewares/upload';
import {
  getAll,
  getById,
  createArticle,
  updateArticle,
  deleteArticle,
} from '../controllers/articleController';

const router = Router();

const querySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

router.get('/', requireAuth, validateQuery(querySchema), getAll);
router.get('/:id', requireAuth, getById);
router.post('/', requireAuth, upload.single('image'), validate(createSchema), createArticle);
router.put('/:id', requireAuth, upload.single('image'), validate(updateSchema), updateArticle);
router.delete('/:id', requireAuth, deleteArticle);

export default router;
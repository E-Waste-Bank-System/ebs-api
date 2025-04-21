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

/**
 * @openapi
 * /api/articles:
 *   get:
 *     tags:
 *       - Articles
 *     summary: Retrieve a paginated list of articles
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: A list of articles with total count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Article'
 *                 total:
 *                   type: integer
 */

const router = Router();

const querySchema = z.object({
  limit: z.preprocess(val => parseInt(val as string), z.number().int().positive()).optional(),
  offset: z.preprocess(val => parseInt(val as string), z.number().int().nonnegative()).optional(),
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

/**
 * @openapi
 * /api/articles/{id}:
 *   get:
 *     tags:
 *       - Articles
 *     summary: Retrieve a single article by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Article details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', requireAuth, getById);

/**
 * @openapi
 * /api/articles:
 *   post:
 *     tags:
 *       - Articles
 *     summary: Create a new article
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *             required: [title, content, image]
 *     responses:
 *       201:
 *         description: Article created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', requireAuth, upload.single('image'), validate(createSchema), createArticle);

/**
 * @openapi
 * /api/articles/{id}:
 *   put:
 *     tags:
 *       - Articles
 *     summary: Update an existing article
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Article updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', requireAuth, upload.single('image'), validate(updateSchema), updateArticle);

/**
 * @openapi
 * /api/articles/{id}:
 *   delete:
 *     tags:
 *       - Articles
 *     summary: Delete an article by its ID
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
 *       204:
 *         description: Article deleted
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', requireAuth, deleteArticle);

export default router;
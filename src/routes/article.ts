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

/**
 * @swagger
 * tags:
 *   name: Articles
 *   description: Article management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Article:
 *       type: object
 *       required:
 *         - id
 *         - title
 *         - content
 *         - image_url
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the article
 *         title:
 *           type: string
 *           description: Title of the article
 *         content:
 *           type: string
 *           description: Content of the article
 *         image_url:
 *           type: string
 *           description: URL of the article's featured image
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the article was created
 * 
 *     ArticleList:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Article'
 *         total:
 *           type: integer
 *           description: Total number of articles
 */

/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Get all articles with pagination
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: List of articles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArticleList'
 *       401:
 *         description: Unauthorized
 * 
 *   post:
 *     summary: Create a new article
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - image
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the article
 *               content:
 *                 type: string
 *                 description: Content of the article
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Featured image for the article
 *     responses:
 *       201:
 *         description: Article created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized
 * 
 * /articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       404:
 *         description: Article not found
 *       401:
 *         description: Unauthorized
 * 
 *   put:
 *     summary: Update article
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: New title of the article
 *               content:
 *                 type: string
 *                 description: New content of the article
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: New featured image for the article
 *     responses:
 *       200:
 *         description: Article updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       404:
 *         description: Article not found
 *       401:
 *         description: Unauthorized
 * 
 *   delete:
 *     summary: Delete article
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     responses:
 *       204:
 *         description: Article deleted successfully
 *       404:
 *         description: Article not found
 *       401:
 *         description: Unauthorized
 */

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
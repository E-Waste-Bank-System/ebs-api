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
 *   description: Educational content management for e-waste awareness
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
 *           description: Content of the article in markdown format
 *         image_url:
 *           type: string
 *           format: uri
 *           description: URL of the article's featured image
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the article was created
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         title: "Cara Mendaur Ulang Limbah Elektronik dengan Benar"
 *         content: "# Pendahuluan\n\nLimbah elektronik atau e-waste merupakan masalah lingkungan yang semakin mendesak. Artikel ini menjelaskan cara mengelola e-waste dengan benar.\n\n## Langkah-langkah\n\n1. Pisahkan komponen\n2. Identifikasi material berbahaya\n3. Cari pusat daur ulang resmi"
 *         image_url: "https://storage.googleapis.com/ebs-bucket/article_123456.jpg"
 *         created_at: "2023-06-01T12:00:00Z"
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
 *           description: Total number of articles available
 *       example:
 *         data: 
 *           - id: "550e8400-e29b-41d4-a716-446655440000"
 *             title: "Cara Mendaur Ulang Limbah Elektronik dengan Benar"
 *             content: "# Pendahuluan\n\nLimbah elektronik atau e-waste merupakan masalah lingkungan yang semakin mendesak..."
 *             image_url: "https://storage.googleapis.com/ebs-bucket/article_123456.jpg"
 *             created_at: "2023-06-01T12:00:00Z"
 *         total: 15
 */

/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Get all articles with pagination
 *     description: Retrieves a paginated list of articles sorted by creation date (newest first)
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of articles to return per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of articles to skip (for pagination)
 *     responses:
 *       200:
 *         description: Successfully retrieved articles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArticleList'
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized - valid token required
 * 
 *   post:
 *     summary: Create a new article
 *     description: Creates a new educational article with text content and a featured image
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
 *                 example: "Dampak Limbah Elektronik pada Lingkungan"
 *               content:
 *                 type: string
 *                 description: Content of the article in markdown format
 *                 example: "# Pendahuluan\n\nLimbah elektronik memiliki dampak serius pada lingkungan kita..."
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
 *         description: Bad request - missing required fields or invalid data
 *       401:
 *         description: Unauthorized - valid token required
 *       500:
 *         description: Server error during image upload or article creation
 * 
 * /articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     description: Retrieves a specific article by its unique identifier
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article's unique identifier
 *     responses:
 *       200:
 *         description: Article details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       401:
 *         description: Unauthorized - valid token required
 *       404:
 *         description: Article not found
 * 
 *   put:
 *     summary: Update article
 *     description: Updates an existing article's content, title, and/or image
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article's unique identifier
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated title of the article
 *                 example: "Cara Efektif Mengurangi Limbah Elektronik"
 *               content:
 *                 type: string
 *                 description: Updated content of the article
 *                 example: "# Strategi Pengurangan E-Waste\n\nBerikut adalah beberapa strategi efektif untuk mengurangi limbah elektronik..."
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: New featured image for the article (optional)
 *     responses:
 *       200:
 *         description: Article updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       400:
 *         description: Bad request - invalid data
 *       401:
 *         description: Unauthorized - valid token required
 *       404:
 *         description: Article not found
 *       500:
 *         description: Server error during image upload or update process
 * 
 *   delete:
 *     summary: Delete article
 *     description: Permanently removes an article and its associated image
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article's unique identifier
 *     responses:
 *       204:
 *         description: Article deleted successfully
 *       401:
 *         description: Unauthorized - valid token required
 *       404:
 *         description: Article not found
 *       500:
 *         description: Server error during deletion process
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
import express, { Router } from 'express';
import { AuthRequest } from '../types/auth';
import { isAuthenticated } from '../middlewares/role';
import { ArticleService } from '../services/articleService';
import {
  getArticleBySlug,
  getArticlesByAuthor,
  getArticlesByStatus,
  getById
} from '../controllers/articleController';
import { asyncHandler, asyncAuthHandler } from '../utils/asyncHandler';
import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

const router = Router();
const articleService = new ArticleService();

/**
 * @swagger
 * tags:
 *   name: Articles
 *   description: Article management and publishing
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
 *         - slug
 *         - author_id
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the article
 *         title:
 *           type: string
 *           description: Article title
 *         content:
 *           type: string
 *           description: Article content in markdown format
 *         image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL of the article's featured image
 *         slug:
 *           type: string
 *           description: URL-friendly version of the title
 *         author_id:
 *           type: string
 *           format: uuid
 *           description: ID of the article author
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *           description: Current status of the article
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the article was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the article was last updated
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         title: "How to Recycle Electronics"
 *         content: "# How to Recycle Electronics\n\nLearn the best practices..."
 *         image_url: "https://storage.googleapis.com/ebs-bucket/article_123456.jpg"
 *         slug: "how-to-recycle-electronics"
 *         author_id: "d0ac0ecb-b4d7-4d81-bcd7-c0bcec391527"
 *         status: "published"
 *         created_at: "2023-06-01T12:00:00Z"
 *         updated_at: "2023-06-01T12:30:00Z"
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
 *     summary: Get all articles
 *     description: Retrieve a paginated list of articles
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of articles
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
 *                   description: Total number of articles
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create a new article
 *     description: Create a new article with the provided data
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 description: Article title
 *               content:
 *                 type: string
 *                 description: Article content in markdown format
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: URL of the article's featured image
 *     responses:
 *       201:
 *         description: Article created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Article'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid article data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const { data, total } = await articleService.getAll(limit, offset);
  res.json({ data, total, page, limit });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const article = await articleService.getById(id);
  if (!article) {
    res.status(404).json({ message: 'Article not found' });
    return;
  }
  res.json(article);
}));

router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const { title, content, tags } = req.body;
  const userId = (req as AuthRequest).user?.id;

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { data: article, error } = await supabase
    .from('articles')
    .insert([
      {
        title,
        content,
        author_id: userId,
      },
    ])
    .select()
    .single();

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  // Insert tags if provided
  if (tags && tags.length > 0) {
    const { error: tagError } = await supabase
      .from('tags')
      .insert(tags.map((tag: string) => ({
        name: tag,
        article_id: article.id,
      })));

    if (tagError) {
      res.status(500).json({ message: tagError.message });
      return;
    }
  }

  res.status(201).json(article);
}));

/**
 * @swagger
 * /articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     description: Retrieve a specific article by its ID
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Article not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update article
 *     description: Update an existing article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Article title
 *               content:
 *                 type: string
 *                 description: Article content in markdown format
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: URL of the article's featured image
 *     responses:
 *       200:
 *         description: Article updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Article'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid update data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Article not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete article
 *     description: Delete an existing article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Article not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, tags } = req.body;
  const userId = (req as AuthRequest).user?.id;

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  // Update article
  const { data: article, error } = await supabase
    .from('articles')
    .update({
      title,
      content,
    })
    .eq('id', id)
    .eq('author_id', userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  // Update tags if provided
  if (tags && tags.length > 0) {
    // Delete existing tags
    await supabase
      .from('tags')
      .delete()
      .eq('article_id', id);

    // Insert new tags
    const { error: tagError } = await supabase
      .from('tags')
      .insert(tags.map((tag: string) => ({
        name: tag,
        article_id: id,
      })));

    if (tagError) {
      res.status(500).json({ message: tagError.message });
      return;
    }
  }

  res.json(article);
}));

router.delete('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthRequest).user?.id;

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)
    .eq('author_id', userId);

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  res.status(204).send();
}));

router.post('/:id/publish', isAuthenticated, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthRequest).user?.id;

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { data: article, error } = await supabase
    .from('articles')
    .update({ published: true })
    .eq('id', id)
    .eq('author_id', userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  res.json(article);
}));

router.post('/:id/archive', isAuthenticated, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = (req as AuthRequest).user?.id;

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { data: article, error } = await supabase
    .from('articles')
    .update({ archived: true })
    .eq('id', id)
    .eq('author_id', userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  res.json(article);
}));

/**
 * @swagger
 * /articles/slug/{slug}:
 *   get:
 *     summary: Get article by slug
 *     description: Retrieve a specific article by its slug
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Article slug
 *     responses:
 *       200:
 *         description: Article details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Article'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Article not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/slug/:slug', getArticleBySlug);

/**
 * @swagger
 * /articles/author:
 *   get:
 *     summary: Get articles by author
 *     description: Retrieve articles written by the authenticated user
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by article status
 *     responses:
 *       200:
 *         description: List of articles
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
 *                   description: Total number of articles
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/author', isAuthenticated, asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user?.id;

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { data: articles, error } = await supabase
    .from('articles')
    .select(`
      *,
      tags (*),
      author:users (
        id,
        name,
        email
      )
    `)
    .eq('author_id', userId);

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  res.json(articles);
}));

/**
 * @swagger
 * /articles/status/{status}:
 *   get:
 *     summary: Get articles by status
 *     description: Retrieve articles filtered by their status
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Article status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of articles
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
 *                   description: Total number of articles
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/status/:status', getArticlesByStatus);

export default router;
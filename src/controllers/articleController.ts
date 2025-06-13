import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { articleService, ArticleService } from '../services/articleService';
import { uploadImage } from '../utils/gcs';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/error-utils';
import { z } from 'zod';
import { AuthRequest } from '../types/auth';

function createSafeFilename(originalFilename: string): string {
  const extension = originalFilename.includes('.') 
    ? originalFilename.split('.').pop() 
    : '';
  return `article_${uuidv4()}${extension ? '.' + extension.replace(/[^\w.-]/g, '') : ''}`;
}

// Validation schemas
const articleQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  status: z.enum(['draft', 'published', 'archived']).optional()
});

const articleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  image_url: z.string().url().optional(),
  author_id: z.string().uuid()
});

const updateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  image_url: z.string().url().optional()
});

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = articleQuerySchema.parse(req.query);
    const { data, total } = await articleService.getAll(
      query.limit || 10,
      ((query.page || 1) - 1) * (query.limit || 10)
    );
    res.json({
      data,
      total,
      page: query.page || 1,
      limit: query.limit || 10
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: error.errors,
        statusCode: 400
      });
      return;
    }

    logger.error('Error in getAll controller', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get articles',
      statusCode: 500
    });
  }
};

export const getById = async (req: Request, res: Response, next: any) => {
  try {
    const article = await articleService.getById(req.params.id);
    res.json(article);
  } catch (err: unknown) {
    next(err);
  }
};

export async function createArticle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        statusCode: 401
      });
      return;
    }

    const articleData = articleSchema.parse({
      ...req.body,
      author_id: userId
    });

    const article = await articleService.createArticle(articleData);
    logger.info('Article created successfully', { articleId: article.id });

    res.status(201).json({
      data: article,
      message: 'Article created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid article data',
        details: error.errors,
        statusCode: 400
      });
      return;
    }

    logger.error('Error in createArticle controller', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create article',
      statusCode: 500
    });
  }
}

export async function updateArticle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        statusCode: 401
      });
      return;
    }

    const updateData = updateArticleSchema.parse(req.body);
    const article = await articleService.updateArticle(id, updateData);
    logger.info('Article updated successfully', { articleId: id });

    res.json({
      data: article,
      message: 'Article updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid update data',
        details: error.errors,
        statusCode: 400
      });
      return;
    }

    logger.error('Error in updateArticle controller', { error, articleId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update article',
      statusCode: 500
    });
  }
}

export const getArticleBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;
    const article = await articleService.getArticleBySlug(slug);

    if (!article) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Article not found',
        statusCode: 404
      });
      return;
    }

    res.json({
      data: article
    });
  } catch (error) {
    logger.error('Error in getArticleBySlug controller', { error, slug: req.params.slug });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get article',
      statusCode: 500
    });
  }
};

export const getArticlesByAuthor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        statusCode: 401
      });
      return;
    }

    const query = articleQuerySchema.parse(req.query);
    const result = await articleService.getArticlesByAuthor(userId, query);

    res.json({
      data: result.data,
      total: result.total,
      page: query.page || 1,
      limit: query.limit || 10
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: error.errors,
        statusCode: 400
      });
      return;
    }
    logger.error('Error in getArticlesByAuthor controller', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get articles',
      statusCode: 500
    });
  }
};

export const getArticlesByStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = articleQuerySchema.parse(req.query);
    const result = await articleService.getArticlesByStatus(query.status || 'published', query);

    res.json({
      data: result.data,
      total: result.total,
      page: query.page || 1,
      limit: query.limit || 10
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: error.errors,
        statusCode: 400
      });
      return;
    }

    logger.error('Error in getArticlesByStatus controller', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get articles',
      statusCode: 500
    });
  }
};

export const publishArticle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const article = await articleService.publishArticle(id);
    logger.info('Article published successfully', { articleId: id });

    res.json({
      data: article,
      message: 'Article published successfully'
    });
  } catch (error) {
    logger.error('Error in publishArticle controller', { error, articleId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to publish article',
      statusCode: 500
    });
  }
};

export const archiveArticle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const article = await articleService.archiveArticle(id);
    logger.info('Article archived successfully', { articleId: id });

    res.json({
      data: article,
      message: 'Article archived successfully'
    });
  } catch (error) {
    logger.error('Error in archiveArticle controller', { error, articleId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to archive article',
      statusCode: 500
    });
  }
};

export async function deleteArticle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await articleService.deleteArticle(id);
    logger.info('Article deleted successfully', { articleId: id });

    res.status(204).send();
  } catch (error) {
    logger.error('Error in deleteArticle controller', { error, articleId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete article',
      statusCode: 500
    });
  }
}

export class ArticleController {
  private service: ArticleService;

  constructor() {
    this.service = new ArticleService();
  }

  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { data, total } = await this.service.getAll(limit, offset);
    return res.json({ data, total, page, limit });
  }

  async getById(id: string) {
    return await this.service.getById(id);
  }

  async create(article: any) {
    return await this.service.createArticle(article);
  }

  async update(id: string, article: any) {
    return await this.service.updateArticle(id, article);
  }

  async delete(id: string) {
    return await this.service.deleteArticle(id);
  }
}

// Export singleton instance
export const articleController = new ArticleController();
import { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as articleService from '../services/articleService';
import { uploadImage } from '../utils/gcs';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/error-utils';

// Helper function for safe filename creation
function createSafeFilename(originalFilename: string): string {
  // Extract file extension
  const extension = originalFilename.includes('.') 
    ? originalFilename.split('.').pop() 
    : '';
  // Create a safe filename with UUID and clean extension
  return `article_${uuidv4()}${extension ? '.' + extension.replace(/[^\w.-]/g, '') : ''}`;
}

export const getAll: RequestHandler = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = (req as any).query;
    const { data, total } = await articleService.getAll(Number(limit), Number(offset));
    res.json({ data, total });
  } catch (err: unknown) {
    next(err);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const article = await articleService.getById(req.params.id);
    res.json(article);
  } catch (err: unknown) {
    next(err);
  }
};

export const createArticle: RequestHandler = async (req, res, next) => {
  try {
    logger.debug('createArticle req.file:', req.file);
    logger.debug('createArticle req.body:', req.body);
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    
    // Use safe filename generation
    const safeFilename = createSafeFilename(req.file.originalname);
    logger.debug(`Original filename: ${req.file.originalname}, Safe filename: ${safeFilename}`);
    
    const imageUrl = await uploadImage(
      req.file.buffer,
      safeFilename,
      req.file.mimetype
    );
    
    const newArticle = await articleService.create({
      id: uuidv4(),
      title: req.body.title,
      content: req.body.content,
      imageUrl,
      created_at: new Date().toISOString(),
    });
    res.status(201).json(newArticle);
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);
    logger.error(`Error creating article: ${errorMessage}`, { error: err });
    next(err);
  }
};

export const updateArticle: RequestHandler = async (req, res, next) => {
  try {
    logger.debug('updateArticle req.file:', req.file);
    logger.debug('updateArticle req.body:', req.body);
    const fields: any = { ...req.body };
    if (req.file) {
      // Use safe filename generation
      const safeFilename = createSafeFilename(req.file.originalname);
      logger.debug(`Original filename: ${req.file.originalname}, Safe filename: ${safeFilename}`);
      
      fields.imageUrl = await uploadImage(
        req.file.buffer,
        safeFilename,
        req.file.mimetype
      );
    }
    const updated = await articleService.update(req.params.id, fields);
    res.json(updated);
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);
    logger.error(`Error updating article: ${errorMessage}`, { error: err });
    next(err);
  }
};

export const deleteArticle: RequestHandler = async (req, res, next) => {
  try {
    await articleService.remove(req.params.id);
    res.status(204).end();
  } catch (err: unknown) {
    next(err);
  }
};
import { Request, Response, NextFunction } from 'express';
import { ContentService } from '../services/content.service';
import { AppError } from '../utils/error';
import { successResponse } from '../utils/response';

const contentService = new ContentService();

// Get all content
export const getAllContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contents = await contentService.getAllContent();
    successResponse(res, 200, 'Content retrieved successfully', contents);
  } catch (error) {
    next(error);
  }
};

// Get content by ID
export const getContentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const content = await contentService.getContentById(id);
    successResponse(res, 200, 'Content retrieved successfully', content);
  } catch (error) {
    next(error);
  }
};

// Create content (admin only)
export const createContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    const { title, body, type, imageUrl } = req.body;

    // Validate required fields
    if (!title || !body || !type) {
      throw new AppError(400, 'Title, body, and type are required');
    }

    const content = await contentService.createContent(title, body, type, imageUrl);
    successResponse(res, 201, 'Content created successfully', content);
  } catch (error) {
    next(error);
  }
};

// Update content (admin only)
export const updateContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    const { id } = req.params;
    const { title, body, type, imageUrl } = req.body;

    // Check if at least one field to update is provided
    if (!title && !body && !type && imageUrl === undefined) {
      throw new AppError(400, 'At least one field to update is required');
    }

    const updatedContent = await contentService.updateContent(id, title, body, type, imageUrl);
    successResponse(res, 200, 'Content updated successfully', updatedContent);
  } catch (error) {
    next(error);
  }
};

// Delete content (admin only)
export const deleteContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden');
    }

    const { id } = req.params;
    await contentService.deleteContent(id);
    successResponse(res, 200, 'Content deleted successfully', null);
  } catch (error) {
    next(error);
  }
}; 
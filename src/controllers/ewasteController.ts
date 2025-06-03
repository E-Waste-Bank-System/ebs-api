import { Request, Response, NextFunction } from 'express';
import { ewasteService } from '../services/ewasteService';
import { AuthRequest } from '../middleware/auth';

export const getEWaste = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ewaste = await ewasteService.getEWasteWithDetails(id);
    if (!ewaste) {
      return res.status(404).json({ message: 'E-waste not found' });
    }
    res.json(ewaste);
  } catch (error) {
    next(error);
  }
};

export const getEWasteList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      startDate,
      endDate
    } = req.query;

    const options = {
      page: Number(page),
      limit: Number(limit),
      status: status as 'pending' | 'approved' | 'rejected' | undefined,
      category: category as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    };

    const result = await ewasteService.getEWasteListWithFilters(options);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createEWaste = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const ewaste = await ewasteService.createEWaste({
      ...req.body,
      user_id: userId,
      status: 'pending'
    });
    res.status(201).json(ewaste);
  } catch (error) {
    next(error);
  }
};

export const updateEWaste = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const ewaste = await ewasteService.updateEWaste(id, {
      ...req.body,
      updated_at: new Date().toISOString()
    });
    res.json(ewaste);
  } catch (error) {
    next(error);
  }
};

export const deleteEWaste = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await ewasteService.deleteEWaste(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const validateEWaste = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validatedBy = req.user?.id;

    if (!validatedBy) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const ewaste = await ewasteService.validateEWaste(id, validatedBy, status);
    res.json(ewaste);
  } catch (error) {
    next(error);
  }
};

export const getEWasteByCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.params;
    const ewaste = await ewasteService.getEWasteByCategory(category);
    res.json(ewaste);
  } catch (error) {
    next(error);
  }
};

export const getEWasteByUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const ewaste = await ewasteService.getEWasteByUser(userId);
    res.json(ewaste);
  } catch (error) {
    next(error);
  }
}; 
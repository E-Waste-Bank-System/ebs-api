import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
import { ewasteService } from '../services/ewaste';

export class EWasteController {
  async getAll(req: Request, res: Response): Promise<void> {
    const ewaste = await ewasteService.findAll();
    res.json(ewaste);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const ewaste = await ewasteService.findById(id);
    if (!ewaste) {
      res.status(404).json({ message: 'E-waste item not found' });
      return;
    }
    res.json(ewaste);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const ewaste = await ewasteService.create({
      ...req.body,
      user_id: req.user.id,
      status: 'pending'
    });
    res.status(201).json(ewaste);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const ewaste = await ewasteService.update(id, req.body);
    if (!ewaste) {
      res.status(404).json({ message: 'E-waste item not found' });
      return;
    }
    res.json(ewaste);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    await ewasteService.delete(id);
    res.status(204).send();
  }

  async getByUserId(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const ewaste = await ewasteService.findByUserId(req.user.id);
    res.json(ewaste);
  }

  async getByCategory(req: Request, res: Response): Promise<void> {
    const { category } = req.params;
    const ewaste = await ewasteService.findByCategory(category);
    res.json(ewaste);
  }

  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await ewasteService.getStats();
    res.json(stats);
  }

  async getDetailedStats(req: Request, res: Response): Promise<void> {
    const stats = await ewasteService.getDetailedStats();
    res.json(stats);
  }
}

export const ewasteController = new EWasteController(); 
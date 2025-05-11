import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';

export async function getAllAdmins(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await userService.getAllAdmins();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getAdminById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await userService.getAdminById(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
} 
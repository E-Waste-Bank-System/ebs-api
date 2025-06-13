import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      res.status(400).json({ message: 'Invalid query parameters', error });
    }
  };
}
import { AnyZodObject } from 'zod';
import { Request, Response, NextFunction } from 'express';

const validateQuery = (schema: AnyZodObject) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ errors: result.error.format() });
    return;
  }
  (req as any).validatedQuery = result.data;
  next();
};

export default validateQuery;
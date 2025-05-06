import { AnyZodObject } from 'zod';
import { RequestHandler } from 'express';

export default function validateQuery(schema: AnyZodObject): RequestHandler {
  return (req, res, next) => {
    try {
      // Parse and validate the query parameters without reassigning req.query
      const validatedQuery = schema.parse(req.query);
      
      // Instead of reassigning req.query directly (which would fail),
      // we'll add the validated data to the request object under a new property
      (req as any).validatedQuery = validatedQuery;
      
      next();
    } catch (err: any) {
      res.status(400).json({ message: err.errors || err.message });
      return;
    }
  };
}
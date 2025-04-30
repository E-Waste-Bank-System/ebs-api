import { Request, Response, NextFunction } from 'express';
import xssFilters from 'xss-filters';

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return xssFilters.inHTMLData(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      obj[key] = sanitizeObject(obj[key]);
    }
    return obj;
  }
  return obj;
}

export default function sanitize(req: Request, res: Response, next: NextFunction) {
  if (req.body) req.body = sanitizeObject(req.body);
  // Mutate req.query in place (do not reassign)
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      req.query[key] = sanitizeObject(req.query[key]);
    }
  }
  // Mutate req.params in place (do not reassign)
  if (req.params && typeof req.params === 'object') {
    for (const key in req.params) {
      req.params[key] = sanitizeObject(req.params[key]);
    }
  }
  next();
}
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
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
}
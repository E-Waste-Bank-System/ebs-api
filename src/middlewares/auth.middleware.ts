import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/error';

// Define the user type from Supabase
interface SupabaseUser {
  id: string;
  role: string;
  email: string;
}

// Extend the Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: SupabaseUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      throw new AppError(401, 'Invalid token');
    }

    // Get additional user data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', data.user.id)
      .single();

    if (userError || !userData) {
      throw new AppError(401, 'User not found');
    }

    // Set user on request
    req.user = {
      id: data.user.id,
      role: userData.role,
      email: data.user.email || ''
    };
    
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Authentication failed'));
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'Forbidden');
    }

    next();
  };
}; 
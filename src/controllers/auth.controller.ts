import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/error';
import { successResponse } from '../utils/response';
import { validateRegister, validateLogin } from '../utils/validation';

// Register controller
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    const validationError = validateRegister(name, email, password);
    if (validationError) {
      throw new AppError(400, validationError);
    }

    // Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });

    if (authError) {
      throw new AppError(400, authError.message);
    }

    // Create user record in database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user?.id,
        name,
        email,
        role: 'USER',
        is_blocked: false
      })
      .select()
      .single();

    if (dbError) {
      throw new AppError(400, dbError.message);
    }

    successResponse(res, 201, 'Registration successful', {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role
    });
  } catch (error) {
    next(error);
  }
};

// Login controller
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    const validationError = validateLogin(email, password);
    if (validationError) {
      throw new AppError(400, validationError);
    }

    // Authenticate with Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Check if user is blocked
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('is_blocked')
      .eq('id', data.user.id)
      .single();

    if (dbError) {
      throw new AppError(500, 'Error fetching user data');
    }

    if (userData.is_blocked) {
      throw new AppError(403, 'Your account has been blocked');
    }

    successResponse(res, 200, 'Login successful', {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role || 'USER'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token is required');
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      throw new AppError(401, 'Invalid refresh token');
    }

    successResponse(res, 200, 'Token refreshed successfully', {
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata.name,
        role: data.user?.user_metadata.role || 'USER'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Logout controller
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new AppError(500, 'Error during logout');
    }

    successResponse(res, 200, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    const user = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    successResponse(res, 200, 'Profile retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

// Rename this endpoint to match the requested API endpoint from the collection
export const me = getProfile; 
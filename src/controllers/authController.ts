import { Request, Response, NextFunction } from 'express';
import supabase from '../utils/supabase';
import { isAdminUser, getUserById } from '../services/authService';
import { signToken } from '../utils/token';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }
    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const user_id = data.user.id;
    // Check if user is admin
    const isAdmin = await isAdminUser(user_id);
    if (!isAdmin) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const token = signToken({ id: user_id, user: { id: user_id, email, is_admin: true } });
    res.json({ user: { id: user_id, email, is_admin: true }, token });
  } catch (err: unknown) {
    next(err);
  }
}

export async function getToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      res.status(400).json({ message: 'user_id is required' });
      return;
    }

    // Get user data from Supabase Auth using admin API
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !userData || !userData.user || !userData.user.email) {
      res.status(401).json({ message: 'Invalid user' });
      return;
    }

    // Create token payload with the correct structure
    const tokenPayload = {
      id: userData.user.id,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        is_admin: false
      }
    };

    const token = signToken(tokenPayload);
    res.json({ user: { id: userData.user.id, email: userData.user.email }, token });
  } catch (err: unknown) {
    next(err);
  }
}
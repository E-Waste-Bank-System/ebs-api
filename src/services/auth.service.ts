import { supabase } from '../config/supabase';
import { AppError } from '../utils/error';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export class AuthService {
  async register(name: string, email: string, password: string): Promise<{ user: Partial<User>; token: string }> {
    // First, create a user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw new AppError(authError.status || 400, authError.message);
    }

    if (!authData.user) {
      throw new AppError(400, 'Failed to create user');
    }

    // Then, store additional user data in the 'users' table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        name,
        email,
        role: 'USER',
      });

    if (profileError) {
      // If failed to create profile, attempt to delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new AppError(400, profileError.message);
    }

    return {
      user: {
        id: authData.user.id,
        name,
        email,
        role: 'USER',
      },
      token: authData.session?.access_token || '',
    };
  }

  async login(email: string, password: string): Promise<{ user: Partial<User>; token: string }> {
    // Sign in to Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new AppError(authError.status || 401, 'Invalid credentials');
    }

    if (!authData.user || !authData.session) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Get user profile from the 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      throw new AppError(401, 'User profile not found');
    }

    return {
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: new Date(userData.created_at),
      },
      token: authData.session.access_token,
    };
  }

  async getProfile(userId: string): Promise<User> {
    // Get user profile from the 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      throw new AppError(404, 'User not found');
    }

    return {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      createdAt: new Date(userData.created_at),
    };
  }
}
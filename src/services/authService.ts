import supabase from '../utils/supabase';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password?: string;
  provider?: 'email' | 'google';
  google_id?: string;  // Changed from googleId to google_id
  is_admin?: boolean;  // Changed from isadmin to is_admin
}

export async function registerUser(email: string, password: string, is_admin: boolean = false): Promise<User> {
  const hashed = await bcrypt.hash(password, 10);
  const newUser: User = { id: uuidv4(), email, password: hashed, is_admin };
  const { data, error } = await supabase.from('users').insert(newUser).select().single();
  if (error) throw error;
  return data;
}

export async function authenticateUser(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error || !data) throw new Error('Invalid email or password');
  const match = await bcrypt.compare(password, data.password);
  if (!match) throw new Error('Invalid email or password');
  return { id: data.id, email: data.email, password: data.password };
}

export async function authenticateAdmin(email: string, password: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('is_admin', true)  // Changed from isadmin to is_admin
    .single();
  if (error || !data) throw new Error('Invalid admin credentials');
  const match = await bcrypt.compare(password, data.password!);
  if (!match) throw new Error('Invalid admin credentials');
  return data;
}

/**
 * Perform Google authentication: verify ID token, upsert user
 */
import { OAuth2Client } from 'google-auth-library';
import env from '../config/env';
// Initialize Google OAuth2Client with client ID for audience validation
const googleClient = new OAuth2Client(env.googleClientId);

export async function loginWithGoogle(idToken: string): Promise<User> {
  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.googleClientId });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) throw new Error('Invalid Google token');
  // check existing by google_id
  const { data, error } = await supabase.from('users').select('*').eq('google_id', payload.sub).single();
  if (error && error.code !== 'PGRST116') throw error; // ignore not found
  if (data) return { ...data };
  // insert new user
  const newUser = { id: uuidv4(), email: payload.email, provider: 'google', google_id: payload.sub };
  const insert = await supabase.from('users').insert(newUser).select().single();
  if (insert.error) throw insert.error;
  return insert.data;
}
import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as authService from '../services/authService';
import { signToken } from '../utils/token';
import * as userService from '../services/userService';
import supabase from '../config/supabase';

export const login: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const user = await authService.login(email, password);
    const token = signToken({ id: user.id, email: user.email });
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict' });
    res.json({ message: 'Login successful' });
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

export const signup: RequestHandler = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const user = await userService.signup(email, password, name);
    res.status(201).json({ message: 'Signup successful', user });
  } catch (err) {
    next(err);
  }
};

export const profile: RequestHandler = async (req: any, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', req.user.id)
      .single();
    if (error) throw Object.assign(new Error(error.message), { status: 404 });
    res.json(data);
  } catch (err) {
    next(err);
  }
};
import { Request, Response, NextFunction } from 'express';
import { isAdminUser, getUserById } from '../services/authService';
import { signToken } from '../utils/token';

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with Supabase Auth user_id
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     is_admin:
 *                       type: boolean
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user_id } = req.body;
    // Fetch user details
    const user = await getUserById(user_id);
    if (!user || !user.is_admin) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const token = signToken({ id: user.id, is_admin: user.is_admin });
    res.json({ user: { id: user.id, is_admin: user.is_admin }, token });
  } catch (err: unknown) {
    next(err);
  }
}
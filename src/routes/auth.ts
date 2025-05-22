import { Router } from 'express';
import { login, getToken } from '../controllers/authController';
import validate from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and token management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               description: User's unique identifier
 *             email:
 *               type: string
 *               format: email
 *               description: User's email address
 *             is_admin:
 *               type: boolean
 *               description: Whether the user has administrator privileges
 *         token:
 *           type: string
 *           description: JWT authentication token to be used in Authorization header
 *       example:
 *         user:
 *           id: "d0ac0ecb-b4d7-4d81-bcd7-c0bcec391527"
 *           email: "user@example.com"
 *           is_admin: false
 *         token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate as admin user
 *     description: Validates email and password credentials for admin users against Supabase Auth
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin user email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Admin user password
 *             example:
 *               email: "admin@example.com"
 *               password: "securepassword"
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Invalid credentials or user not authorized as admin
 */

/**
 * @swagger
 * /auth/token:
 *   post:
 *     summary: Generate auth token from Supabase user ID
 *     description: Creates a JWT token for a valid Supabase user ID (mobile app authentication flow)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: Supabase user ID
 *             example:
 *               user_id: "d0ac0ecb-b4d7-4d81-bcd7-c0bcec391527"
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Missing user_id field
 *       401:
 *         description: Invalid user ID or user not found
 */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const tokenSchema = z.object({
  user_id: z.string().uuid(),
});

router.post('/login', validate(loginSchema), login);
router.post('/token', validate(tokenSchema), getToken);

export default router;
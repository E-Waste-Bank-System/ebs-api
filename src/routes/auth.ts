import { Router } from 'express';
import { login, getToken } from '../controllers/authController';
import validateBody from '../middlewares/validateBody';
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
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token obtained from login or token endpoints
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
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error type
 *         message:
 *           type: string
 *           description: Detailed error message
 *         statusCode:
 *           type: integer
 *           description: HTTP status code
 *         details:
 *           type: array
 *           items:
 *             type: object
 *           description: Additional error details (for validation errors)
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials or user not authorized as admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid user ID or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const tokenSchema = z.object({
  user_id: z.string().uuid(),
});

router.post('/login', validateBody(loginSchema), login);
router.post('/token', validateBody(tokenSchema), getToken);

export default router;
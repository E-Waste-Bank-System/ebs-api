import { Router } from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/role';
import * as userController from '../controllers/userController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admins
 *   description: Administrator user management
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Admin:
 *       type: object
 *       required:
 *         - id
 *         - user_id
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the admin record
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: Reference to the Supabase Auth user ID
 *         name:
 *           type: string
 *           description: Display name of the administrator
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the admin record was created
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         user_id: "d0ac0ecb-b4d7-4d81-bcd7-c0bcec391527"
 *         name: "Admin User"
 *         created_at: "2023-06-01T12:00:00Z"
 */
/**
 * @swagger
 * /admins:
 *   get:
 *     summary: Get all admin users
 *     description: Retrieves a list of all administrator users (admin access required)
 *     tags: [Admins]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of admin users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Admin'
 *       401:
 *         description: Unauthorized - valid token required
 *       403:
 *         description: Forbidden - admin access required
 */
router.get('/', isAdmin, userController.getAllAdmins);
/**
 * @swagger
 * /admins/{id}:
 *   get:
 *     summary: Get admin by ID
 *     description: Retrieves details of a specific administrator by ID (admin access required)
 *     tags: [Admins]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin record's unique identifier
 *     responses:
 *       200:
 *         description: Admin user details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Admin'
 *       401:
 *         description: Unauthorized - valid token required
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: Admin not found
 */
router.get('/:id', isAdmin, userController.getAdminById);

export default router; 
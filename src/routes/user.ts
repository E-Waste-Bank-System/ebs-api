import { Router } from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/role';
import * as userController from '../controllers/userController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admins
 *   description: Admin management endpoints
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Admin:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         user_id:
 *           type: string
 *         name:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /admins:
 *   get:
 *     summary: Get all admins
 *     tags: [Admins]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of admins
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Admin'
 */
router.get('/', isAdmin, userController.getAllAdmins);
/**
 * @swagger
 * /admins/{id}:
 *   get:
 *     summary: Get admin by ID
 *     tags: [Admins]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Admin'
 *       404:
 *         description: Admin not found
 */
router.get('/:id', isAdmin, userController.getAdminById);

export default router; 
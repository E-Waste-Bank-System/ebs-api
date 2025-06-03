import express from 'express';
import { isAdmin } from '../middleware/auth';
import {
  getEWaste,
  getEWasteList,
  createEWaste,
  updateEWaste,
  deleteEWaste,
  validateEWaste,
  getEWasteByCategory,
  getEWasteByUser
} from '../controllers/ewasteController';

const router = express.Router();

/**
 * @swagger
 * /api/ewaste/{id}:
 *   get:
 *     summary: Get e-waste details by ID
 *     tags: [E-Waste]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: E-waste details retrieved successfully
 *       404:
 *         description: E-waste not found
 */
router.get('/:id', getEWaste);

/**
 * @swagger
 * /api/ewaste:
 *   get:
 *     summary: Get list of e-waste with filters
 *     tags: [E-Waste]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of e-waste retrieved successfully
 */
router.get('/', getEWasteList);

/**
 * @swagger
 * /api/ewaste:
 *   post:
 *     summary: Create new e-waste entry
 *     tags: [E-Waste]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - risk_level
 *             properties:
 *               category:
 *                 type: string
 *               risk_level:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: E-waste created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', createEWaste);

/**
 * @swagger
 * /api/ewaste/{id}:
 *   put:
 *     summary: Update e-waste entry
 *     tags: [E-Waste]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *               risk_level:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: E-waste updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: E-waste not found
 */
router.put('/:id', updateEWaste);

/**
 * @swagger
 * /api/ewaste/{id}:
 *   delete:
 *     summary: Delete e-waste entry
 *     tags: [E-Waste]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: E-waste deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: E-waste not found
 */
router.delete('/:id', deleteEWaste);

/**
 * @swagger
 * /api/ewaste/{id}/validate:
 *   post:
 *     summary: Validate e-waste entry
 *     tags: [E-Waste]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *     responses:
 *       200:
 *         description: E-waste validated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: E-waste not found
 */
router.post('/:id/validate', isAdmin, validateEWaste);

/**
 * @swagger
 * /api/ewaste/category/{category}:
 *   get:
 *     summary: Get e-waste by category
 *     tags: [E-Waste]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of e-waste by category retrieved successfully
 */
router.get('/category/:category', getEWasteByCategory);

/**
 * @swagger
 * /api/ewaste/user:
 *   get:
 *     summary: Get e-waste by current user
 *     tags: [E-Waste]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of e-waste by user retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/user', getEWasteByUser);

export default router; 
import express from "express";
import {
    createRawMaterialCategory,
    getRawMaterialCategories,
    getRawMaterialCategoryById,
    updateRawMaterialCategory,
    deleteRawMaterialCategory,
} from "../controllers/rawMaterialCategoryController";
import { authenticateToken } from "../middlewares/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken as any);

/**
 * @swagger
 * tags:
 *   name: Raw Material Categories
 *   description: Raw material category management endpoints (Admin only)
 */

/**
 * @swagger
 * /api/raw-material-categories:
 *   post:
 *     summary: Create a new raw material category
 *     description: Create a new raw material category (Admin only)
 *     tags: [Raw Material Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *               description:
 *                 type: string
 *                 description: Category description
 *     responses:
 *       201:
 *         description: Raw material category created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Category name already exists
 */
router.post('/', createRawMaterialCategory);

/**
 * @swagger
 * /api/raw-material-categories:
 *   get:
 *     summary: Get all raw material categories
 *     description: Retrieve list of all raw material categories
 *     tags: [Raw Material Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', getRawMaterialCategories);

/**
 * @swagger
 * /api/raw-material-categories/{id}:
 *   get:
 *     summary: Get raw material category by ID
 *     description: Retrieve a specific raw material category by its ID
 *     tags: [Raw Material Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.get('/:id', getRawMaterialCategoryById);

/**
 * @swagger
 * /api/raw-material-categories/{id}:
 *   put:
 *     summary: Update raw material category by ID
 *     description: Update an existing raw material category's details (Admin only)
 *     tags: [Raw Material Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *               description:
 *                 type: string
 *                 description: Category description
 *               isActive:
 *                 type: boolean
 *                 description: Whether the category is active
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Category not found
 */
router.put('/:id', updateRawMaterialCategory);

/**
 * @swagger
 * /api/raw-material-categories/{id}:
 *   delete:
 *     summary: Delete raw material category by ID
 *     description: Soft delete a raw material category (Admin only)
 *     tags: [Raw Material Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Category not found
 */
router.delete('/:id', deleteRawMaterialCategory);

export default router;

import express, { RequestHandler } from "express";
import {
    createRawMaterial,
    getRawMaterials,
    getRawMaterialById,
    updateRawMaterial,
    deleteRawMaterial,
} from "../controllers/rawMaterialController";
import { authenticateToken } from "../middlewares/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken as any);

/**
 * @swagger
 * tags:
 *   name: Raw Materials
 *   description: Raw material management endpoints
 */

/**
 * @swagger
 * /api/raw-materials:
 *   post:
 *     summary: Create a new raw material
 *     description: Create a new raw material (Admin only)
 *     tags: [Raw Materials]
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
 *               - categoryId
 *               - supplierId
 *               - unit
 *               - unitPrice
 *             properties:
 *               name:
 *                 type: string
 *                 description: Raw material name
 *               categoryId:
 *                 type: string
 *                 description: Category ID
 *               supplierId:
 *                 type: string
 *                 description: Supplier ID
 *               unit:
 *                 type: string
 *                 description: Unit of measurement (kg, pieces, liters, ml, etc.)
 *               unitPrice:
 *                 type: number
 *                 description: Price per unit
 *               isPerishable:
 *                 type: boolean
 *                 description: Whether the material is perishable
 *                 default: false
 *               shelfLife:
 *                 type: integer
 *                 description: Shelf life in days (for perishable items)
 *     responses:
 *       201:
 *         description: Raw material created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/', createRawMaterial);

/**
 * @swagger
 * /api/raw-materials:
 *   get:
 *     summary: Get all raw materials
 *     description: Retrieve list of raw materials with optional filters
 *     tags: [Raw Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: isPerishable
 *         schema:
 *           type: boolean
 *         description: Filter by perishable status
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Filter by shop ID (for shop owners)
 *     responses:
 *       200:
 *         description: List of raw materials retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', getRawMaterials);

/**
 * @swagger
 * /api/raw-materials/{id}:
 *   get:
 *     summary: Get raw material by ID
 *     description: Retrieve a specific raw material by its ID
 *     tags: [Raw Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Raw material ID
 *     responses:
 *       200:
 *         description: Raw material retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Raw material not found
 */
router.get('/:id', getRawMaterialById);

/**
 * @swagger
 * /api/raw-materials/{id}:
 *   put:
 *     summary: Update raw material by ID
 *     description: Update an existing raw material's details (Admin only)
 *     tags: [Raw Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Raw material ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Raw material name
 *               categoryId:
 *                 type: string
 *                 description: Category ID
 *               supplierId:
 *                 type: string
 *                 description: Supplier ID
 *               unit:
 *                 type: string
 *                 description: Unit of measurement
 *               unitPrice:
 *                 type: number
 *                 description: Price per unit
 *               isPerishable:
 *                 type: boolean
 *                 description: Whether the material is perishable
 *               shelfLife:
 *                 type: integer
 *                 description: Shelf life in days
 *               isActive:
 *                 type: boolean
 *                 description: Whether the material is active
 *     responses:
 *       200:
 *         description: Raw material updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Raw material not found
 */
router.put('/:id', updateRawMaterial);

/**
 * @swagger
 * /api/raw-materials/{id}:
 *   delete:
 *     summary: Delete raw material by ID
 *     description: Soft delete a raw material (Admin only)
 *     tags: [Raw Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Raw material ID
 *     responses:
 *       200:
 *         description: Raw material deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Raw material not found
 */
router.delete('/:id', deleteRawMaterial);

export default router;

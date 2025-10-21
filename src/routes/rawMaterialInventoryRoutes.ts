import express, { RequestHandler } from "express";
import {
    createRawMaterialInventory,
    getRawMaterialInventories,
    updateRawMaterialInventory,
    deleteRawMaterialInventory,
} from "../controllers/rawMaterialInventoryController";
import { authenticateToken } from "../middlewares/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken as any);

/**
 * @swagger
 * tags:
 *   name: Raw Material Inventory
 *   description: Raw material inventory management endpoints
 */

/**
 * @swagger
 * /api/raw-material-inventory:
 *   post:
 *     summary: Create raw material inventory
 *     description: Add raw material to shop or factory inventory
 *     tags: [Raw Material Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - materialId
 *               - currentStock
 *               - minStockLevel
 *             properties:
 *               shopId:
 *                 type: string
 *                 description: Shop ID (optional for factory inventory)
 *               materialId:
 *                 type: string
 *                 description: Raw material ID
 *               currentStock:
 *                 type: number
 *                 description: Current stock quantity
 *               minStockLevel:
 *                 type: number
 *                 description: Minimum stock level for alerts
 *               maxStockLevel:
 *                 type: number
 *                 description: Maximum stock level
 *               batchNumber:
 *                 type: string
 *                 description: Batch number for tracking
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: Expiry date for perishable items
 *     responses:
 *       201:
 *         description: Raw material inventory created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 */
router.post('/', createRawMaterialInventory);

/**
 * @swagger
 * /api/raw-material-inventory:
 *   get:
 *     summary: Get raw material inventories
 *     description: Retrieve raw material inventories with optional filters
 *     tags: [Raw Material Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Filter by shop ID
 *       - in: query
 *         name: materialId
 *         schema:
 *           type: string
 *         description: Filter by material ID
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter for low stock items
 *     responses:
 *       200:
 *         description: List of raw material inventories retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', getRawMaterialInventories);

/**
 * @swagger
 * /api/raw-material-inventory/{id}:
 *   put:
 *     summary: Update raw material inventory
 *     description: Update raw material inventory details
 *     tags: [Raw Material Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentStock:
 *                 type: number
 *                 description: Current stock quantity
 *               minStockLevel:
 *                 type: number
 *                 description: Minimum stock level for alerts
 *               maxStockLevel:
 *                 type: number
 *                 description: Maximum stock level
 *               batchNumber:
 *                 type: string
 *                 description: Batch number for tracking
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: Expiry date for perishable items
 *     responses:
 *       200:
 *         description: Raw material inventory updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Inventory not found
 */
router.put('/:id', updateRawMaterialInventory);

/**
 * @swagger
 * /api/raw-material-inventory/{id}:
 *   delete:
 *     summary: Delete raw material inventory
 *     description: Delete raw material inventory (Admin only)
 *     tags: [Raw Material Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory ID
 *     responses:
 *       200:
 *         description: Raw material inventory deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Inventory not found
 */
router.delete('/:id', deleteRawMaterialInventory);

export default router;

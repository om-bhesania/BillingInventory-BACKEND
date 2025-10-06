import express, { RequestHandler } from "express";
import {
  createShopInventory,
  getShopInventory,
  updateShopInventoryStock,
  removeProductFromShop,
} from "../controllers/shopInventoryController";
import { authenticateToken } from "../middlewares/auth";

const shopInventoryRoutes = express.Router();

// Apply authentication middleware to all routes
shopInventoryRoutes.use(authenticateToken as any);

/**
 * @swagger
 * tags:
 *   name: Shop Inventory
 *   description: Shop inventory management endpoints (token required)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ShopInventory:
 *       type: object
 *       required:
 *         - shopId
 *         - productId
 *         - currentStock
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated UUID of the inventory entry
 *         shopId:
 *           type: string
 *           description: ID of the shop
 *         productId:
 *           type: string
 *           description: ID of the product
 *         currentStock:
 *           type: integer
 *           minimum: 0
 *           description: Current stock level in the shop
 *         minStockPerItem:
 *           type: integer
 *           minimum: 0
 *           description: Minimum stock level for this shop (overrides product default)
 *         lowStockAlertsEnabled:
 *           type: boolean
 *           description: Whether low stock alerts are enabled for this item
 *           default: true
 *         lastRestockDate:
 *           type: string
 *           format: date-time
 *           description: Date of last restock
 *         isActive:
 *           type: boolean
 *           description: Whether the inventory entry is active
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         shop:
 *           type: object
 *           description: Shop details
 *         product:
 *           type: object
 *           description: Product details with category and flavor
 *       example:
 *         id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *         shopId: "shop-123"
 *         productId: "product-456"
 *         currentStock: 25
 *         minStockPerItem: 10
 *         lowStockAlertsEnabled: true
 *         lastRestockDate: "2023-05-16T10:30:00Z"
 *         isActive: true
 *         createdAt: "2023-05-16T10:30:00Z"
 *         updatedAt: "2023-05-16T10:30:00Z"
 *     ShopInventoryCreate:
 *       type: object
 *       required:
 *         - shopId
 *         - productId
 *       properties:
 *         shopId:
 *           type: string
 *           description: ID of the shop
 *         productId:
 *           type: string
 *           description: ID of the product
 *         currentStock:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *           description: Initial stock level
 *         minStockPerItem:
 *           type: integer
 *           minimum: 0
 *           description: Minimum stock level for this shop
 *         lowStockAlertsEnabled:
 *           type: boolean
 *           default: true
 *           description: Whether low stock alerts are enabled
 *         items:
 *           type: array
 *           description: Bulk creation items
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               currentStock:
 *                 type: integer
 *                 minimum: 0
 *               minStockPerItem:
 *                 type: integer
 *                 minimum: 0
 *               lowStockAlertsEnabled:
 *                 type: boolean
 *     ShopInventoryStockUpdate:
 *       type: object
 *       required:
 *         - currentStock
 *       properties:
 *         currentStock:
 *           type: integer
 *           minimum: 0
 *           description: New stock level
 */

/**
 * @swagger
 * /api/shop-inventory:
 *   post:
 *     summary: Create shop inventory entry
 *     description: Create a new inventory entry for a product in a shop. Supports both single item and bulk creation. Shop Owners can only create entries for their managed shops.
 *     tags: [Shop Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShopInventoryCreate'
 *     responses:
 *       201:
 *         description: Shop inventory entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ShopInventory'
 *                 - type: object
 *                   properties:
 *                     createdCount:
 *                       type: integer
 *                       description: Number of items created in bulk operation
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ShopInventory'
 *       400:
 *         description: Bad request - validation error or product not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied to shop
 *       404:
 *         description: Shop or product not found
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.post("/", createShopInventory as RequestHandler);

/**
 * @swagger
 * /api/shop-inventory/{shopId}:
 *   get:
 *     summary: Get shop inventory
 *     description: Retrieve all inventory entries for a specific shop. Shop Owners can only access their managed shops.
 *     tags: [Shop Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop inventory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShopInventory'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied to shop
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.get("/:shopId", getShopInventory as RequestHandler);

/**
 * @swagger
 * /api/shop-inventory/{id}/stock:
 *   patch:
 *     summary: Update shop inventory stock
 *     description: Update the stock level for a specific inventory entry. Triggers low stock alerts if enabled and stock is below threshold.
 *     tags: [Shop Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShopInventoryStockUpdate'
 *     responses:
 *       200:
 *         description: Shop inventory stock updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopInventory'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied to shop
 *       404:
 *         description: Inventory entry not found
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.patch(
  "/:id/stock",
  updateShopInventoryStock as RequestHandler
);

/**
 * @swagger
 * /api/shop-inventory/{id}:
 *   delete:
 *     summary: Remove product from shop
 *     description: Soft delete a product from shop inventory by marking it as inactive. Shop Owners can only remove products from their managed shops.
 *     tags: [Shop Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory entry ID
 *     responses:
 *       200:
 *         description: Product removed from shop successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product removed from shop successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied to shop
 *       404:
 *         description: Inventory entry not found
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.delete("/:id", removeProductFromShop as RequestHandler);

export default shopInventoryRoutes;

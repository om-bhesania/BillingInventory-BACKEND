import { Router } from "express";
import {
  createShopInventory,
  getAllShopInventory,
  getShopInventoryByShopId,
  getShopInventoryById,
  updateShopInventory,
  updateStock,
  bulkUpdateShopInventory,
  deleteShopInventory,
  getLowStockItems,
  getInventoryStats,
} from "../controllers/ShopInventoryControl";

const shopInventoryRoutes = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ShopInventory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the inventory item
 *         shopId:
 *           type: string
 *           format: uuid
 *           description: ID of the shop
 *         productId:
 *           type: string
 *           format: uuid
 *           description: ID of the product
 *         currentStock:
 *           type: integer
 *           minimum: 0
 *           description: Current quantity in stock
 *         lastRestockDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date when the item was last restocked
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         shop:
 *           $ref: '#/components/schemas/ShopBasic'
 *         product:
 *           $ref: '#/components/schemas/ProductWithDetails'
 *       example:
 *         id: "123e4567-e89b-12d3-a456-426614174000"
 *         shopId: "shop-123"
 *         productId: "product-456"
 *         currentStock: 50
 *         lastRestockDate: "2024-01-15T10:30:00Z"
 *         createdAt: "2024-01-01T00:00:00Z"
 *         updatedAt: "2024-01-15T10:30:00Z"
 *
 *     CreateShopInventoryRequest:
 *       type: object
 *       required:
 *         - shopId
 *         - productId
 *         - currentStock
 *       properties:
 *         shopId:
 *           type: string
 *           format: uuid
 *           description: ID of the shop
 *         productId:
 *           type: string
 *           format: uuid
 *           description: ID of the product
 *         currentStock:
 *           type: integer
 *           minimum: 0
 *           description: Initial stock quantity
 *         lastRestockDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date when the item was last restocked
 *       example:
 *         shopId: "shop-123"
 *         productId: "product-456"
 *         currentStock: 50
 *         lastRestockDate: "2024-01-15T10:30:00Z"
 *
 *     UpdateStockRequest:
 *       type: object
 *       required:
 *         - quantity
 *       properties:
 *         quantity:
 *           type: integer
 *           description: Quantity for the operation
 *         operation:
 *           type: string
 *           enum: [set, add, subtract]
 *           default: set
 *           description: Type of stock operation
 *       example:
 *         quantity: 25
 *         operation: "add"
 *
 *     BulkUpdateItem:
 *       type: object
 *       required:
 *         - productId
 *         - currentStock
 *       properties:
 *         productId:
 *           type: string
 *           format: uuid
 *           description: ID of the product
 *         currentStock:
 *           type: integer
 *           minimum: 0
 *           description: New stock quantity
 *         lastRestockDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date when the item was last restocked
 *
 *     BulkUpdateRequest:
 *       type: object
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BulkUpdateItem'
 *           description: Array of inventory items to update
 *       example:
 *         items:
 *           - productId: "product-456"
 *             currentStock: 75
 *             lastRestockDate: "2024-01-15T10:30:00Z"
 *           - productId: "product-789"
 *             currentStock: 30
 *
 *     InventoryStats:
 *       type: object
 *       properties:
 *         totalItems:
 *           type: integer
 *           description: Total number of inventory items
 *         totalStock:
 *           type: integer
 *           description: Total stock across all items
 *         lowStockItems:
 *           type: integer
 *           description: Number of items with low stock
 *         outOfStockItems:
 *           type: integer
 *           description: Number of items out of stock
 *         recentlyRestocked:
 *           type: integer
 *           description: Number of items restocked in the last 7 days
 *         healthyStockItems:
 *           type: integer
 *           description: Number of items with healthy stock levels
 *       example:
 *         totalItems: 150
 *         totalStock: 2500
 *         lowStockItems: 12
 *         outOfStockItems: 5
 *         recentlyRestocked: 8
 *         healthyStockItems: 133
 *
 *   tags:
 *     - name: Shop Inventory
 *       description: Shop inventory management operations
 */

/**
 * @swagger
 * /api/shop-inventory:
 *   post:
 *     summary: Create a new shop inventory item
 *     description: Add a new product to a shop's inventory
 *     tags: [Shop Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShopInventoryRequest'
 *     responses:
 *       201:
 *         description: Shop inventory item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopInventory'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Shop ID is required"
 *       404:
 *         description: Shop or product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Shop not found"
 *       409:
 *         description: Inventory item already exists for this shop and product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Inventory item already exists for this shop and product combination"
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.post("/", createShopInventory);

/**
 * @swagger
 * /api/shop-inventory:
 *   get:
 *     summary: Get all shop inventory items
 *     description: Retrieve all inventory items with optional filtering
 *     tags: [Shop Inventory]
 *     parameters:
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by shop ID
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by product ID
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Filter items with stock less than or equal to this value
 *     responses:
 *       200:
 *         description: List of shop inventory items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShopInventory'
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.get("/", getAllShopInventory);

/**
 * @swagger
 * /api/shop-inventory/stats:
 *   get:
 *     summary: Get inventory statistics
 *     description: Retrieve comprehensive inventory statistics
 *     tags: [Shop Inventory]
 *     parameters:
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter statistics by shop ID
 *     responses:
 *       200:
 *         description: Inventory statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryStats'
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.get("/stats", getInventoryStats);

/**
 * @swagger
 * /api/shop-inventory/low-stock:
 *   get:
 *     summary: Get low stock items
 *     description: Retrieve items with stock below the specified threshold
 *     tags: [Shop Inventory]
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 10
 *         description: Stock threshold for low stock items
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by shop ID
 *     responses:
 *       200:
 *         description: List of low stock items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 threshold:
 *                   type: integer
 *                   description: Applied threshold value
 *                 totalLowStockItems:
 *                   type: integer
 *                   description: Total number of low stock items
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShopInventory'
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.get("/low-stock", getLowStockItems);

/**
 * @swagger
 * /api/shop-inventory/shop/{shopId}:
 *   get:
 *     summary: Get inventory for a specific shop
 *     description: Retrieve all inventory items for a specific shop with filtering options
 *     tags: [Shop Inventory]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shop ID
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Filter items with stock less than or equal to this value
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by product category ID
 *       - in: query
 *         name: flavor
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by product flavor ID
 *     responses:
 *       200:
 *         description: Shop inventory with summary information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shop:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     location:
 *                       type: string
 *                 inventory:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShopInventory'
 *                 totalItems:
 *                   type: integer
 *                   description: Total number of inventory items
 *                 lowStockItems:
 *                   type: integer
 *                   description: Number of low stock items
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.get("/shop/:shopId", getShopInventoryByShopId);

/**
 * @swagger
 * /api/shop-inventory/shop/{shopId}/bulk-update:
 *   put:
 *     summary: Bulk update shop inventory
 *     description: Update multiple inventory items for a specific shop
 *     tags: [Shop Inventory]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdateRequest'
 *     responses:
 *       200:
 *         description: Bulk update completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bulk inventory update completed successfully"
 *                 updatedItems:
 *                   type: integer
 *                   description: Number of items updated
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShopInventory'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.put("/shop/:shopId/bulk-update", bulkUpdateShopInventory);

/**
 * @swagger
 * /api/shop-inventory/{id}:
 *   get:
 *     summary: Get a shop inventory item by ID
 *     description: Retrieve a specific inventory item with full details
 *     tags: [Shop Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Inventory item ID
 *     responses:
 *       200:
 *         description: Shop inventory item details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopInventory'
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.get("/:id", getShopInventoryById);

/**
 * @swagger
 * /api/shop-inventory/{id}:
 *   put:
 *     summary: Update a shop inventory item
 *     description: Update inventory item details
 *     tags: [Shop Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Inventory item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentStock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Current stock quantity
 *               lastRestockDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Date when the item was last restocked
 *             example:
 *               currentStock: 75
 *               lastRestockDate: "2024-01-15T10:30:00Z"
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopInventory'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.put("/:id", updateShopInventory);

/**
 * @swagger
 * /api/shop-inventory/{id}:
 *   delete:
 *     summary: Delete a shop inventory item
 *     description: Remove an inventory item from the shop
 *     tags: [Shop Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Inventory item ID
 *     responses:
 *       200:
 *         description: Inventory item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Shop inventory item deleted successfully"
 *                 deletedItem:
 *                   type: object
 *                   properties:
 *                     shopName:
 *                       type: string
 *                     productName:
 *                       type: string
 *                     previousStock:
 *                       type: integer
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.delete("/:id", deleteShopInventory);

/**
 * @swagger
 * /api/shop-inventory/{id}/update-stock:
 *   patch:
 *     summary: Update stock quantity
 *     description: Perform stock adjustments with different operations (set, add, subtract)
 *     tags: [Shop Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Inventory item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStockRequest'
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ShopInventory'
 *                 - type: object
 *                   properties:
 *                     stockChange:
 *                       type: object
 *                       properties:
 *                         operation:
 *                           type: string
 *                           enum: [set, add, subtract]
 *                         quantity:
 *                           type: integer
 *                         previousStock:
 *                           type: integer
 *                         newStock:
 *                           type: integer
 *       400:
 *         description: Invalid input data or stock cannot be negative
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */
shopInventoryRoutes.patch("/:id/update-stock", updateStock);

export default shopInventoryRoutes;

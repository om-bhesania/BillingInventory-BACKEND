"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const shopControllers_1 = require("../controllers/shopControllers");
const shopRoutes = express_1.default.Router();
// Apply authentication middleware to all shop routes
shopRoutes.use(auth_1.authenticateToken);
// Apply rate limiting to all shop routes
shopRoutes.use(rateLimiter_1.userRateLimiter);
/**
 * @swagger
 * tags:
 *   name: Shops
 *   description: Shop management endpoints (token required)
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Shop:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated UUID of the shop
 *         name:
 *           type: string
 *           description: Shop name

 *         address:
 *           type: string
 *           description: Shop address
 *         contactNumber:
 *           type: string
 *           description: Shop contact number
 *         email:
 *           type: string
 *           description: Shop email
 *         operatingHours:
 *           type: string
 *           description: Shop operating hours
 *         isActive:
 *           type: boolean
 *           description: Whether the shop is active
 *           default: true
 *         openingDate:
 *           type: string
 *           format: date-time
 *           description: Shop opening date
 *         managerName:
 *           type: string
 *           description: Shop manager's name
 *         maxCapacity:
 *           type: integer
 *           description: Maximum number of customers
 *         description:
 *           type: string
 *           description: Shop description
 *         logoUrl:
 *           type: string
 *           description: URL to shop logo
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *         name: "Ice Cream Haven"

 *         address: "123 Main Street"
 *         contactNumber: "+1234567890"
 *         email: "contact@icecreamhaven.com"
 *         operatingHours: "9:00 AM - 9:00 PM"
 *         isActive: true
 *         openingDate: "2023-01-01T00:00:00Z"
 *         managerName: "John Doe"
 *         maxCapacity: 50
 *         description: "Premium ice cream shop with over 30 flavors"
 *         logoUrl: "https://example.com/logo.png"
 *         createdAt: "2023-05-16T10:30:00Z"
 *         updatedAt: "2023-05-16T10:30:00Z"
 */
/**
 * @swagger
 * /api/shops:
 *   post:
 *     summary: Create a new shop
 *     description: Create a new shop with owner and manager assignments (Admin only)
 *     tags: [Shops]
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

 *               - address
 *               - contactNumber
 *               - email
 *               - operatingHours
 *             properties:
 *               name:
 *                 type: string
 *                 description: Shop name

 *               address:
 *                 type: string
 *                 description: Shop address
 *               contactNumber:
 *                 type: string
 *                 description: Shop contact number
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Shop email
 *               operatingHours:
 *                 type: string
 *                 description: Shop operating hours
 *               description:
 *                 type: string
 *                 description: Shop description
 *               ownerId:
 *                 type: integer
 *                 description: ID of the shop owner
 *               managerId:
 *                 type: integer
 *                 description: ID of the shop manager
 *     responses:
 *       201:
 *         description: Shop created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
shopRoutes.post("/add-shop", shopControllers_1.createShop);
shopRoutes.post("/link", shopControllers_1.linkShopToUser);
shopRoutes.post("/unlink", shopControllers_1.unlinkShopFromUser);
/**
 * @swagger
 * /api/shops:
 *   get:
 *     summary: Get all shops
 *     description: Retrieve list of all shops with owner and manager information
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of shops retrieved successfully
 *       401:
 *         description: Unauthorized
 */
shopRoutes.get("/get-all-shops", shopControllers_1.getAllShops);
/**
 * @swagger
 * /api/shops/{id}:
 *   get:
 *     summary: Get shop by ID
 *     description: Retrieve a specific shop by its ID with owner and manager details
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop not found
 */
shopRoutes.get("/:id", shopControllers_1.getShopById);
/**
 * @swagger
 * /api/shops/{id}:
 *   put:
 *     summary: Update shop by ID
 *     description: Update an existing shop's details (Admin or Shop Owner only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Shop name
 *               location:
 *                 type: string
 *                 description: Shop location
 *               address:
 *                 type: string
 *                 description: Shop address
 *               contactNumber:
 *                 type: string
 *                 description: Shop contact number
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Shop email
 *               operatingHours:
 *                 type: string
 *                 description: Shop operating hours
 *               description:
 *                 type: string
 *                 description: Shop description
 *               ownerId:
 *                 type: integer
 *                 description: ID of the shop owner
 *               managerId:
 *                 type: integer
 *                 description: ID of the shop manager
 *               isActive:
 *                 type: boolean
 *                 description: Whether the shop is active
 *     responses:
 *       200:
 *         description: Shop updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Shop not found
 */
shopRoutes.put("/:id", shopControllers_1.updateShop);
/**
 * @swagger
 * /api/shops/{id}:
 *   delete:
 *     summary: Delete shop by ID
 *     description: Delete a shop from the system (Admin only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Shop not found
 */
shopRoutes.delete("/:id", shopControllers_1.deleteShop);
/**
 * @swagger
 * /api/shops/{id}/force:
 *   delete:
 *     summary: Force delete shop with all related data
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop and all related data deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedData:
 *                   type: object
 *                   properties:
 *                     inventoryCount:
 *                       type: number
 *                     billingCount:
 *                       type: number
 *                     restockRequestCount:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Failed to force delete shop
 */
shopRoutes.delete("/:id/force", shopControllers_1.forceDeleteShop);
/**
 * @swagger
 * /api/shops/{id}/link-manager:
 *   post:
 *     summary: Link a manager to a shop
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userPublicId:
 *                 type: string
 *                 description: User's public ID to assign as manager
 *     responses:
 *       200:
 *         description: Manager linked successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Shop or user not found
 */
shopRoutes.post("/:id/link-manager", shopControllers_1.linkShopManager);
/**
 * @swagger
 * /api/shops/{id}/unlink-manager:
 *   delete:
 *     summary: Unlink manager from a shop
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Manager unlinked successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Shop not found
 */
shopRoutes.delete("/:id/unlink-manager", shopControllers_1.unlinkShopManager);
/**
 * @swagger
 * /shops/{id}/delete-all-data:
 *   delete:
 *     summary: Delete all shop data (Admin only)
 *     description: Permanently deletes all data related to a shop including inventory, billing, restock requests, and the shop itself. Unlinks manager but preserves employee records.
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: All shop data deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 shopId:
 *                   type: string
 *                 deletedRecords:
 *                   type: object
 *                   properties:
 *                     inventory:
 *                       type: number
 *                     restockRequests:
 *                       type: number
 *                     billings:
 *                       type: number
 *                     managerUnlinked:
 *                       type: boolean
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Internal server error
 */
shopRoutes.delete("/:id/delete-all-data", shopControllers_1.deleteAllShopData);
exports.default = shopRoutes;

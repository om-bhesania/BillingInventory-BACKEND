import express, { RequestHandler } from "express";
import { authenticateToken } from "../middlewares/ErrorHandlers/checkAccess";
import {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop,
} from "../controllers/shopControllers";

const shopRoutes = express.Router();

// Apply authentication middleware to all shop routes
shopRoutes.use(authenticateToken);

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
 *         location:
 *           type: string
 *           description: Shop location
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
 *         location: "Downtown"
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
 *               - location
 *               - address
 *               - contactNumber
 *               - email
 *               - operatingHours
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
shopRoutes.post("/add-shop", createShop as RequestHandler);

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
shopRoutes.get("/get-all-shops", getAllShops as RequestHandler);

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
shopRoutes.get("/:id", getShopById as RequestHandler);

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
shopRoutes.put("/:id", updateShop as RequestHandler);

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
shopRoutes.delete("/:id", deleteShop as RequestHandler);

export default shopRoutes;

import express from "express";

import {
  createShop,
  deleteShop,
  getAllShops,
  getShopById,
  updateShop,
} from "../controllers/shopControllers";

const shopRoutes = express.Router();

/**
 * @swagger
 * tags:
 *   name: Shops
 *   description: Shop management endpoints
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
 *     tags: [Shops]
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
 *               location:
 *                 type: string
 *               address:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               operatingHours:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               openingDate:
 *                 type: string
 *                 format: date-time
 *               managerName:
 *                 type: string
 *               maxCapacity:
 *                 type: integer
 *               description:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Shop created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Shop'
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Server error
 */
shopRoutes.post("/add-shop", createShop);

/**
 * @swagger
 * /api/shops:
 *   get:
 *     summary: Get all shops
 *     tags: [Shops]
 *     responses:
 *       200:
 *         description: List of all shops
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Shop'
 *       500:
 *         description: Server error
 */
shopRoutes.get("/get-all-shops", getAllShops);

/**
 * @swagger
 * /api/shops/{id}:
 *   get:
 *     summary: Get a shop by ID
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Shop'
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
shopRoutes.get("/:id", getShopById);

/**
 * @swagger
 * /api/shops/{id}:
 *   put:
 *     summary: Update a shop
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
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
 *               location:
 *                 type: string
 *               address:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               operatingHours:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               openingDate:
 *                 type: string
 *                 format: date-time
 *               managerName:
 *                 type: string
 *               maxCapacity:
 *                 type: integer
 *               description:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shop updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Shop'
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
shopRoutes.put("/:id", updateShop);

/**
 * @swagger
 * /api/shops/{id}:
 *   delete:
 *     summary: Delete a shop
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop deleted successfully
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
shopRoutes.delete("/:id", deleteShop);

export default shopRoutes;

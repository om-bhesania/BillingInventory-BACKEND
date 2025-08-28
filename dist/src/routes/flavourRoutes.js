"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const flavourController_1 = require("../controllers/flavourController");
const auth_1 = require("../middlewares/auth");
const flavourRoutes = express_1.default.Router();
// Apply authentication middleware to all flavour routes
flavourRoutes.use(auth_1.authenticateToken);
/**
 * @swagger
 * tags:
 *   name: Flavours
 *   description: Product flavour management endpoints (token required)
 */
/**
 * @swagger
 * /api/flavours:
 *   get:
 *     summary: Get all flavours
 *     description: Retrieve list of all product flavours
 *     tags: [Flavours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of flavours retrieved successfully
 *       401:
 *         description: Unauthorized
 */
flavourRoutes.get("/", flavourController_1.getFlavors);
/**
 * @swagger
 * /api/flavours/{id}:
 *   get:
 *     summary: Get flavour by ID
 *     description: Retrieve a specific flavour by its ID with related products
 *     tags: [Flavours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flavour ID
 *     responses:
 *       200:
 *         description: Flavour retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Flavour not found
 */
flavourRoutes.get("/:id", flavourController_1.getFlavorById);
/**
 * @swagger
 * /api/flavours:
 *   post:
 *     summary: Create a new flavour
 *     description: Create a new product flavour (Admin only)
 *     tags: [Flavours]
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
 *                 description: Flavour name
 *               imageUrl:
 *                 type: string
 *                 description: URL to flavour image
 *               isActive:
 *                 type: boolean
 *                 description: Whether the flavour is active
 *                 default: true
 *     responses:
 *       201:
 *         description: Flavour created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Flavour name already exists
 */
flavourRoutes.post("/", flavourController_1.createFlavor);
/**
 * @swagger
 * /api/flavours/{id}:
 *   put:
 *     summary: Update flavour by ID
 *     description: Update an existing flavour's details (Admin only)
 *     tags: [Flavours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flavour ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Flavour name
 *               imageUrl:
 *                 type: string
 *                 description: URL to flavour image
 *               isActive:
 *                 type: boolean
 *                 description: Whether the flavour is active
 *     responses:
 *       200:
 *         description: Flavour updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Flavour not found
 */
flavourRoutes.put("/:id", flavourController_1.updateFlavor);
/**
 * @swagger
 * /api/flavours/{id}:
 *   delete:
 *     summary: Delete flavour by ID
 *     description: Soft delete a flavour (Admin only)
 *     tags: [Flavours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flavour ID
 *     responses:
 *       200:
 *         description: Flavour deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Flavour not found
 */
flavourRoutes.delete("/:id", flavourController_1.deleteFlavor);
exports.default = flavourRoutes;

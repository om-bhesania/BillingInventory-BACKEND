import express, { RequestHandler } from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  createPackagingType,
  getPackagingTypes,
  updatePackagingType,
  deletePackagingType,
} from "../controllers/packagingTypeController";

const router = express.Router();

router.use(authenticateToken as any);

/**
 * @swagger
 * tags:
 *   name: Packaging Types
 *   description: Packaging type management endpoints (token required)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PackagingType:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated UUID of the packaging type
 *         name:
 *           type: string
 *           description: Name of the packaging type
 *         description:
 *           type: string
 *           description: Description of the packaging type
 *         isActive:
 *           type: boolean
 *           description: Whether the packaging type is active
 *           default: true
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
 *         name: "Plastic Container"
 *         description: "Reusable plastic container for ice cream"
 *         isActive: true
 *         createdAt: "2023-05-16T10:30:00Z"
 *         updatedAt: "2023-05-16T10:30:00Z"
 *     PackagingTypeCreate:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the packaging type
 *         description:
 *           type: string
 *           description: Description of the packaging type
 *         isActive:
 *           type: boolean
 *           description: Whether the packaging type is active
 *           default: true
 *     PackagingTypeUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the packaging type
 *         description:
 *           type: string
 *           description: Description of the packaging type
 *         isActive:
 *           type: boolean
 *           description: Whether the packaging type is active
 */

/**
 * @swagger
 * /api/packaging-types:
 *   get:
 *     summary: Get all packaging types
 *     description: Retrieve list of all packaging types
 *     tags: [Packaging Types]
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
 *         description: List of packaging types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PackagingType'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", getPackagingTypes as RequestHandler);

/**
 * @swagger
 * /api/packaging-types:
 *   post:
 *     summary: Create a new packaging type
 *     description: Create a new packaging type (Admin only)
 *     tags: [Packaging Types]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PackagingTypeCreate'
 *     responses:
 *       201:
 *         description: Packaging type created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackagingType'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Packaging type name already exists
 *       500:
 *         description: Internal server error
 */
router.post("/", createPackagingType as RequestHandler);

/**
 * @swagger
 * /api/packaging-types/{id}:
 *   put:
 *     summary: Update packaging type by ID
 *     description: Update an existing packaging type's details (Admin only)
 *     tags: [Packaging Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Packaging type ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PackagingTypeUpdate'
 *     responses:
 *       200:
 *         description: Packaging type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackagingType'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Packaging type not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", updatePackagingType as RequestHandler);

/**
 * @swagger
 * /api/packaging-types/{id}:
 *   delete:
 *     summary: Delete packaging type by ID
 *     description: Soft delete a packaging type (Admin only)
 *     tags: [Packaging Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Packaging type ID
 *     responses:
 *       200:
 *         description: Packaging type deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Packaging type deleted successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Packaging type not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", deletePackagingType as RequestHandler);

export default router;



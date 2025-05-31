import express, { RequestHandler } from "express";
import {
  createFlavor,
  getFlavors,
  getFlavorById,
  updateFlavor,
  deleteFlavor,
  hardDeleteFlavor,
  getFlavorProductStats,
} from "../controllers/flavourController"; 
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { userDataFilter } from "../middlewares/filterDataHanlder";

const flavourRoutes = express.Router(); 
/**
 * @swagger
 * tags:
 *   - name: Flavours
 *     description: API endpoints for managing flavours
 */

/**
 * Flavours Routes
 * @swagger
 * /api/flavours:
 *   get:
 *     summary: Get all flavours
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     tags:
 *       - Flavours
 */
flavourRoutes.get(
  "/",
  authMiddleware,
  userDataFilter,
  getFlavors as RequestHandler
);

/**
 * @swagger
 * /api/flavours/{id}:
 *   get:
 *     summary: Get a flavour by ID with related products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flavour ID
 *     tags:
 *       - Flavours
 */
flavourRoutes.get(
  "/:id",
  authMiddleware,
  userDataFilter,
  getFlavorById as RequestHandler
);

/**
 * @swagger
 * /api/flavours/stats:
 *   get:
 *     summary: Get product count statistics for each flavour
 *     tags:
 *       - Flavours
 */
flavourRoutes.get(
  "/stats",
  authMiddleware,
  userDataFilter,
  getFlavorProductStats as RequestHandler
);

/**
 * @swagger
 * /api/flavours:
 *   post:
 *     summary: Create a new flavour
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
 *               imageUrl:
 *                 type: string
 *     tags:
 *       - Flavours
 */
flavourRoutes.post("/", authMiddleware, createFlavor as RequestHandler);

/**
 * @swagger
 * /api/flavours/{id}:
 *   put:
 *     summary: Update a flavour
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flavour ID
 *     tags:
 *       - Flavours
 */
flavourRoutes.put("/:id", authMiddleware, updateFlavor as RequestHandler);

/**
 * @swagger
 * /api/flavours/{id}:
 *   delete:
 *     summary: Deactivate a flavour (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flavour ID
 *     tags:
 *       - Flavours
 */
flavourRoutes.delete("/:id", authMiddleware, deleteFlavor as RequestHandler);

/**
 * @swagger
 * /api/flavours/{id}/permanent:
 *   delete:
 *     summary: Permanently delete a flavour
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flavour ID
 *     tags:
 *       - Flavours
 */
flavourRoutes.delete("/:id/permanent", authMiddleware, hardDeleteFlavor as RequestHandler);

export default flavourRoutes;


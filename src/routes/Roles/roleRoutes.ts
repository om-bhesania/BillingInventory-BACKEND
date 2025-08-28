import express from "express";
import {
  createRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  updateRole,
} from "../../controllers/Roles/Roles"; 
import { authenticateToken } from "../../middlewares/auth";

const roleRoutes = express.Router();

// Apply authentication middleware to all role routes
roleRoutes.use(authenticateToken as any);

/**
 * @swagger
 * tags:
 *   name: Role Management
 *   description: Role and permission management endpoints (token required)
 */

/**
 * @swagger
 * /api/roles/create:
 *   post:
 *     summary: Create a new role
 *     description: Create a new role with specified permissions (Admin only)
 *     tags: [Role Management]
 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - permissions
 *             properties:
 *               name:
 *                 type: string
 *                 description: Role name
 *               description:
 *                 type: string
 *                 description: Role description
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission strings
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
roleRoutes.post("/create", createRole);

/**
 * @swagger
 * /api/roles/getall:
 *   get:
 *     summary: Get all roles
 *     description: Retrieve list of all roles in the system (Admin only)
 *     tags: [Role Management]
 *     responses:
 *       200:
 *         description: List of roles retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
roleRoutes.get("/getall", getAllRoles);

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     description: Retrieve a specific role by its ID (Admin only)
 *     tags: [Role Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Role not found
 */
roleRoutes.get("/:id", getRoleById);

/**
 * @swagger
 * /api/roles/update/{id}:
 *   put:
 *     summary: Update role by ID
 *     description: Update an existing role's details and permissions (Admin only)
 *     tags: [Role Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Role name
 *               description:
 *                 type: string
 *                 description: Role description
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission strings
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Role not found
 */
roleRoutes.put("/update/:id", updateRole);

/**
 * @swagger
 * /api/roles/delete/{id}:
 *   delete:
 *     summary: Delete role by ID
 *     description: Delete a role from the system (Admin only)
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Role not found
 */
roleRoutes.delete("/delete/:id", deleteRole);

export default roleRoutes;

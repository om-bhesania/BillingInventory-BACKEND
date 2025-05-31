import { Router } from "express";
import {
  getPermissionStructure,
  getModulePermissions,
  getRolePermissions,
  checkPermission,
  updateRolePermissions,
  getModules,
  getAllRoles,
  bulkCheckPermissions,
} from "../controllers/PermissionController";
import { userDataFilter } from "../middlewares/filterDataHanlder";

const PermissionsAndRoleRoutes = Router();
// ===============================
// PERMISSION ROUTES WITH SWAGGER
// ===============================

/**
 * @swagger
 * components:
 *   schemas:
 *     Permission:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Role display name
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Read, Write, Update, Delete]
 *           description: Array of CRUD permissions
 *
 *     Module:
 *       type: object
 *       additionalProperties:
 *         $ref: '#/components/schemas/Permission'
 *       description: Object containing roles and their permissions for a module
 *
 *     PermissionStructure:
 *       type: object
 *       properties:
 *         Inventory:
 *           $ref: '#/components/schemas/Module'
 *         ShopInventory:
 *           $ref: '#/components/schemas/Module'
 *         Products:
 *           $ref: '#/components/schemas/Module'
 *         Billing:
 *           $ref: '#/components/schemas/Module'
 *         Employee:
 *           $ref: '#/components/schemas/Module'
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         details:
 *           type: string
 */

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get complete permission structure
 *     description: Returns the entire permission structure with all modules, roles, and their permissions
 *     responses:
 *       200:
 *         description: Permission structure retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PermissionStructure'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
PermissionsAndRoleRoutes.get("/get", getPermissionStructure);

/**
 * @swagger
 * /api/permissions/modules:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get all available modules
 *     description: Returns a list of all available modules in the system
 *     responses:
 *       200:
 *         description: Modules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 modules:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Inventory", "ShopInventory", "Products", "Billing", "Employee"]
 *                 count:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
PermissionsAndRoleRoutes.get("/modules", getModules);

/**
 * @swagger
 * /api/permissions/roles:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get all available roles
 *     description: Returns a list of all available roles across all modules
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Admin", "Shop_Owner"]
 *                 count:
 *                   type: integer
 *                   example: 2
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
PermissionsAndRoleRoutes.get("/roles", getAllRoles);

/**
 * @swagger
 * /api/permissions/modules/{module}:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get permissions for a specific module
 *     description: Returns all roles and their permissions for the specified module
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Inventory, ShopInventory, Products, Billing, Employee]
 *         description: The module name
 *         example: Inventory
 *     responses:
 *       200:
 *         description: Module permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 module:
 *                   type: string
 *                   example: "Inventory"
 *                 data:
 *                   $ref: '#/components/schemas/Module'
 *       404:
 *         description: Module not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
PermissionsAndRoleRoutes.get("/modules/:module", getModulePermissions);

/**
 * @swagger
 * /api/permissions/modules/{module}/roles/{role}:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get permissions for a specific role in a module
 *     description: Returns the permissions for a specific role within a specific module
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Inventory, ShopInventory, Products, Billing, Employee]
 *         description: The module name
 *         example: Inventory
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Admin, Shop_Owner]
 *         description: The role name
 *         example: Admin
 *     responses:
 *       200:
 *         description: Role permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 module:
 *                   type: string
 *                   example: "Inventory"
 *                 role:
 *                   type: string
 *                   example: "Admin"
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       404:
 *         description: Module or role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
PermissionsAndRoleRoutes.get(
  "/modules/:module/roles/:role",
  getRolePermissions
);

/**
 * @swagger
 * /api/permissions/check/{module}/{role}/{permission}:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Check if a role has a specific permission for a module
 *     description: Validates whether a specific role has a particular permission for a given module
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Inventory, ShopInventory, Products, Billing, Employee]
 *         description: The module name
 *         example: Inventory
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Admin, Shop_Owner]
 *         description: The role name
 *         example: Admin
 *       - in: path
 *         name: permission
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Read, Write, Update, Delete]
 *         description: The permission to check
 *         example: Delete
 *     responses:
 *       200:
 *         description: Permission check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 module:
 *                   type: string
 *                   example: "Inventory"
 *                 role:
 *                   type: string
 *                   example: "Admin"
 *                 permission:
 *                   type: string
 *                   example: "Delete"
 *                 hasPermission:
 *                   type: boolean
 *                   example: true
 *                 roleName:
 *                   type: string
 *                   example: "Administrator"
 *       404:
 *         description: Module or role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
PermissionsAndRoleRoutes.get(
  "/check/:module/:role/:permission",
  checkPermission
);

/**
 * @swagger
 * /api/permissions/modules/{module}/roles/{role}:
 *   put:
 *     tags:
 *       - Permissions
 *     summary: Update permissions for a role in a module
 *     description: Updates the permissions array for a specific role within a specific module
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Inventory, ShopInventory, Products, Billing, Employee]
 *         description: The module name
 *         example: Inventory
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Admin, Shop_Owner]
 *         description: The role name
 *         example: Shop_Owner
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Read, Write, Update, Delete]
 *                 description: Array of permissions to assign to the role
 *                 example: ["Read", "Write", "Update"]
 *     responses:
 *       200:
 *         description: Permissions updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Permissions updated successfully"
 *                 module:
 *                   type: string
 *                   example: "Inventory"
 *                 role:
 *                   type: string
 *                   example: "Shop_Owner"
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Invalid permissions provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid permissions"
 *                 invalidPermissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 validPermissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Read", "Write", "Update", "Delete"]
 *       404:
 *         description: Module or role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
PermissionsAndRoleRoutes.put(
  "/modules/:module/roles/:role",
  updateRolePermissions
);

/**
 * @swagger
 * /api/permissions/roles/{role}/bulk:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get all permissions for a role across all modules
 *     description: Returns all permissions for a specific role across all modules where the role exists
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Admin, Shop_Owner]
 *         description: The role name
 *         example: Admin
 *     responses:
 *       200:
 *         description: Bulk permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 role:
 *                   type: string
 *                   example: "Admin"
 *                 permissions:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/Permission'
 *                   example:
 *                     Inventory:
 *                       name: "Administrator"
 *                       permissions: ["Read", "Write", "Update", "Delete"]
 *                     Products:
 *                       name: "Administrator"
 *                       permissions: ["Read", "Write", "Update", "Delete"]
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
PermissionsAndRoleRoutes.get("/roles/:role/bulk", bulkCheckPermissions);

export default PermissionsAndRoleRoutes;

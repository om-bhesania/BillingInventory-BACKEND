"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeeController_1 = require("../controllers/employeeController");
const auth_1 = require("../middlewares/auth");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const employeeRoutes = (0, express_1.Router)();
// Apply authentication and rate limiting to all employee routes
employeeRoutes.use(auth_1.authenticateToken);
employeeRoutes.use(rateLimiter_1.userRateLimiter);
/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee management endpoints (token required)
 */
/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get all employees
 *     description: Retrieve list of all employees with role and shop information
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   contact:
 *                     type: string
 *                   role:
 *                     type: string
 *                   roleId:
 *                     type: string
 *                   shopName:
 *                     type: string
 *                   shopId:
 *                     type: string
 *                   isActive:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
employeeRoutes.get("/", employeeController_1.getAllEmployees);
/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     description: Retrieve a specific employee by their ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Employee not found
 */
employeeRoutes.get("/:id", employeeController_1.getEmployeeById);
/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create new employee
 *     description: Create a new employee account (Admin only)
 *     tags: [Employees]
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
 *               - email
 *               - password
 *               - roleId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Employee's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Employee's email address
 *               contact:
 *                 type: string
 *                 description: Employee's contact number
 *               password:
 *                 type: string
 *                 description: Employee's password
 *               roleId:
 *                 type: string
 *                 description: Role ID for the employee
 *               shopId:
 *                 type: string
 *                 description: Shop ID to assign employee to
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Email already exists
 */
employeeRoutes.post("/", employeeController_1.createEmployee);
/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: Update employee
 *     description: Update an existing employee (Admin only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Employee's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Employee's email address
 *               contact:
 *                 type: string
 *                 description: Employee's contact number
 *               roleId:
 *                 type: string
 *                 description: Role ID for the employee
 *               shopId:
 *                 type: string
 *                 description: Shop ID to assign employee to
 *               isActive:
 *                 type: boolean
 *                 description: Employee active status
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Employee not found
 *       409:
 *         description: Email already exists
 */
employeeRoutes.put("/:id", employeeController_1.updateEmployee);
/**
 * @swagger
 * /api/employees/{id}/status:
 *   patch:
 *     summary: Update employee status
 *     description: Update employee active/inactive status (Admin only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Employee active status
 *     responses:
 *       200:
 *         description: Employee status updated successfully
 *       400:
 *         description: Bad request - isActive must be boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Employee not found
 */
employeeRoutes.patch("/:id/status", employeeController_1.updateEmployeeStatus);
/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     summary: Delete employee
 *     description: Permanently delete an employee from database (Admin only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Employee not found
 */
employeeRoutes.delete("/:id", employeeController_1.deleteEmployee);
/**
 * @swagger
 * /api/employees/roles:
 *   get:
 *     summary: Get available roles
 *     description: Get list of available roles for employee assignment
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
employeeRoutes.get("/roles", employeeController_1.getEmployeeRoles);
/**
 * @swagger
 * /api/employees/shops:
 *   get:
 *     summary: Get available shops
 *     description: Get list of available shops for employee assignment
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of shops retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   address:
 *                     type: string
 *                   contactNumber:
 *                     type: string
 *                   email:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
employeeRoutes.get("/shops", employeeController_1.getAvailableShops);
exports.default = employeeRoutes;

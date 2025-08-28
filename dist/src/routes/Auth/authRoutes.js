"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const Register_1 = require("../../controllers/Auth/Register");
const Login_1 = require("../../controllers/Auth/Login");
const authRoutes = (0, express_1.Router)();
exports.authRoutes = authRoutes;
/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints (no token required)
 */
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with role assignment
 *     tags: [Authentication]
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
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               contact:
 *                 type: string
 *                 description: User's contact number
 *               password:
 *                 type: string
 *                 description: User's password
 *               role:
 *                 type: string
 *                 enum: [Admin, Shop_Owner]
 *                 description: User's role in the system
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request - validation error
 *       409:
 *         description: Email already exists
 */
authRoutes.post("/register", Register_1.register);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return access token with refresh token as httpOnly cookie
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
authRoutes.post("/login", Login_1.login);
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Logout user and clear refresh token cookie
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
authRoutes.post("/logout", Login_1.logout);
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get new access token using refresh token from httpOnly cookie
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 */
authRoutes.post("/refresh", Login_1.refreshToken);
/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve list of all users with their shop associations (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
authRoutes.get("/users", Login_1.listUsers);
/**
 * @swagger
 * /api/auth/roles:
 *   get:
 *     summary: Get available roles
 *     description: Retrieve list of all available roles and their permissions
 *     tags: [Authentication]
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
 *                   permissions:
 *                     type: array
 *                     items:
 *                       type: string
 *       500:
 *         description: Internal server error
 */
authRoutes.get("/roles", Login_1.getRoles);

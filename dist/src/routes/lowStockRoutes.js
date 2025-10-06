"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lowStockController_1 = require("../controllers/lowStockController");
const VerifyJWT_1 = __importDefault(require("../middlewares/VerifyJWT"));
const checkAccess_1 = require("../middlewares/ErrorHandlers/checkAccess");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
// Apply JWT verification and rate limiting to all routes
router.use(VerifyJWT_1.default);
router.use(rateLimiter_1.userRateLimiter);
/**
 * @swagger
 * tags:
 *   name: Low Stock Alerts
 *   description: Low stock alerts and inventory monitoring endpoints (token required)
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     LowStockAlert:
 *       type: object
 *       required:
 *         - productId
 *         - shopId
 *         - currentStock
 *         - minStockLevel
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated UUID of the alert
 *         productId:
 *           type: string
 *           description: ID of the product
 *         shopId:
 *           type: string
 *           description: ID of the shop
 *         currentStock:
 *           type: integer
 *           minimum: 0
 *           description: Current stock level
 *         minStockLevel:
 *           type: integer
 *           minimum: 0
 *           description: Minimum stock level threshold
 *         alertLevel:
 *           type: string
 *           enum: [critical, warning, low]
 *           description: Severity level of the alert
 *         isActive:
 *           type: boolean
 *           description: Whether the alert is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Alert creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         product:
 *           type: object
 *           description: Product details
 *         shop:
 *           type: object
 *           description: Shop details
 *       example:
 *         id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *         productId: "product-123"
 *         shopId: "shop-456"
 *         currentStock: 5
 *         minStockLevel: 10
 *         alertLevel: "critical"
 *         isActive: true
 *         createdAt: "2023-05-16T10:30:00Z"
 *         updatedAt: "2023-05-16T10:30:00Z"
 *     LowStockStats:
 *       type: object
 *       properties:
 *         totalAlerts:
 *           type: integer
 *           description: Total number of low stock alerts
 *         criticalAlerts:
 *           type: integer
 *           description: Number of critical alerts
 *         warningAlerts:
 *           type: integer
 *           description: Number of warning alerts
 *         lowAlerts:
 *           type: integer
 *           description: Number of low alerts
 *         alertsByShop:
 *           type: array
 *           description: Alert count by shop
 *           items:
 *             type: object
 *             properties:
 *               shopId:
 *                 type: string
 *               shopName:
 *                 type: string
 *               alertCount:
 *                 type: integer
 *         alertsByProduct:
 *           type: array
 *           description: Alert count by product
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               productName:
 *                 type: string
 *               alertCount:
 *                 type: integer
 *     LowStockFilters:
 *       type: object
 *       properties:
 *         shops:
 *           type: array
 *           description: Available shops for filtering
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *         products:
 *           type: array
 *           description: Available products for filtering
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *         categories:
 *           type: array
 *           description: Available categories for filtering
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *         alertLevels:
 *           type: array
 *           description: Available alert levels
 *           items:
 *             type: string
 *             enum: [critical, warning, low]
 */
/**
 * @swagger
 * /api/low-stock:
 *   get:
 *     summary: Get low stock alerts
 *     description: Retrieve low stock alerts with pagination and filtering. Access is restricted based on user permissions.
 *     tags: [Low Stock Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of alerts per page
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Filter by shop ID
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter by product ID
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: alertLevel
 *         schema:
 *           type: string
 *           enum: [critical, warning, low]
 *         description: Filter by alert level
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Low stock alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LowStockAlert'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/", (0, checkAccess_1.checkAccess)("Low Stock Alerts", "read"), lowStockController_1.LowStockController.getLowStockAlerts);
/**
 * @swagger
 * /api/low-stock/stats:
 *   get:
 *     summary: Get low stock statistics
 *     description: Retrieve low stock statistics and analytics. Access is restricted based on user permissions.
 *     tags: [Low Stock Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Filter by shop ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Low stock statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LowStockStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/stats", (0, checkAccess_1.checkAccess)("Low Stock Alerts", "read"), lowStockController_1.LowStockController.getLowStockStats);
/**
 * @swagger
 * /api/low-stock/filters:
 *   get:
 *     summary: Get low stock filters
 *     description: Retrieve available filters for low stock alerts. Access is restricted based on user permissions.
 *     tags: [Low Stock Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock filters retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LowStockFilters'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/filters", (0, checkAccess_1.checkAccess)("Low Stock Alerts", "read"), lowStockController_1.LowStockController.getLowStockFilters);
exports.default = router;

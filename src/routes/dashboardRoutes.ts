import { Router, RequestHandler } from "express";
import { DashboardController } from "../controllers/dashboardController";
import verifyJWT from "../middlewares/VerifyJWT";
import { checkAccess } from "../middlewares/ErrorHandlers/checkAccess";
import { dashboardRateLimiter, dashboardRefreshRateLimiter } from "../middlewares/rateLimiter";

const router = Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard metrics and analytics endpoints (token required)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardMetrics:
 *       type: object
 *       properties:
 *         role:
 *           type: string
 *           enum: [Admin, Shop_Owner]
 *           description: User role determining metrics scope
 *         metrics:
 *           type: object
 *           description: Metrics data based on user role
 *           properties:
 *             # Admin metrics
 *             totalRevenue:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   description: Total revenue amount
 *                 count:
 *                   type: integer
 *                   description: Number of transactions
 *                 growth:
 *                   type: number
 *                   description: Growth percentage from previous period
 *                 previousPeriod:
 *                   type: number
 *                   description: Previous period revenue
 *             totalShops:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of active shops
 *                 growth:
 *                   type: number
 *                   description: Growth percentage from previous period
 *                 previousPeriod:
 *                   type: integer
 *                   description: Previous period shop count
 *             totalProducts:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of active products
 *                 previousPeriod:
 *                   type: integer
 *                   description: Previous period product count
 *             totalCategories:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of active categories
 *                 previousPeriod:
 *                   type: integer
 *                   description: Previous period category count
 *             pendingRestockRequests:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Number of pending restock requests
 *                 requests:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       requestedAmount:
 *                         type: integer
 *                       product:
 *                         type: object
 *                       shop:
 *                         type: object
 *             shopPerformance:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   totalRevenue:
 *                     type: number
 *                   orderCount:
 *                     type: integer
 *                   previousRevenue:
 *                     type: number
 *                   revenueGrowth:
 *                     type: number
 *             systemNotifications:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *             bestCategory:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 quantity:
 *                   type: number
 *             bestFlavor:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 quantity:
 *                   type: number
 *             categoryBreakdown:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   category:
 *                     type: string
 *                   quantity:
 *                     type: number
 *             flavorBreakdown:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   flavor:
 *                     type: string
 *                   quantity:
 *                     type: number
 *             salesTrend:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   total:
 *                     type: number
 *             # Shop Owner metrics
 *             shopRevenue:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 count:
 *                   type: integer
 *                 growth:
 *                   type: number
 *                 previousPeriod:
 *                   type: number
 *             topSellingProducts:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   productId:
 *                     type: string
 *                   quantity:
 *                     type: number
 *                   product:
 *                     type: object
 *             currentStockLevels:
 *               type: object
 *               properties:
 *                 totalItems:
 *                   type: integer
 *                 lowStockItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                 lowStockCount:
 *                   type: integer
 *             shopNotifications:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *             restockExpenses:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 count:
 *                   type: integer
 *     DashboardActivity:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           description: Activity type (restock, billing, etc.)
 *         action:
 *           type: string
 *           description: Action performed
 *         details:
 *           type: string
 *           description: Activity details
 *         amount:
 *           type: number
 *           description: Amount involved (if applicable)
 *         status:
 *           type: string
 *           description: Status of the activity
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the activity occurred
 *         shopName:
 *           type: string
 *           description: Shop name (if applicable)
 */

/**
 * @swagger
 * /api/dashboard/metrics:
 *   get:
 *     summary: Get dashboard metrics
 *     description: Retrieve comprehensive dashboard metrics based on user role. Admin users see system-wide metrics, Shop Owners see metrics for their managed shops only.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for metrics calculation (ISO 8601 format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for metrics calculation (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardMetrics'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get(
  "/metrics",
  dashboardRateLimiter,
  checkAccess("Dashboard", "read"),
  DashboardController.getDashboardMetrics as unknown as RequestHandler
);

/**
 * @swagger
 * /api/dashboard/activities:
 *   get:
 *     summary: Get recent activities
 *     description: Retrieve recent system activities for the dashboard. Shows audit logs and recent transactions based on user role and shop access.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DashboardActivity'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get(
  "/activities",
  dashboardRateLimiter,
  checkAccess("Dashboard", "read"),
  DashboardController.getRecentActivities as unknown as RequestHandler
);

/**
 * @swagger
 * /api/dashboard/refresh:
 *   post:
 *     summary: Refresh dashboard metrics
 *     description: Force refresh of dashboard metrics with strict rate limiting (once every 5 minutes). Useful for real-time updates.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for metrics calculation (ISO 8601 format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for metrics calculation (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Dashboard metrics refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardMetrics'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       429:
 *         description: Too Many Requests - Rate limit exceeded (5 minutes between refreshes)
 *       500:
 *         description: Internal server error
 */
router.post(
  "/refresh",
  dashboardRefreshRateLimiter,
  checkAccess("Dashboard", "read"),
  DashboardController.getDashboardMetrics as unknown as RequestHandler
);

export default router;

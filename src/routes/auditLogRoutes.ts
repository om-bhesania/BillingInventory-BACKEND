import { Router, RequestHandler } from "express";
import { AuditLogController } from "../controllers/auditLogController";
import verifyJWT from "../middlewares/VerifyJWT";
import { checkAccess } from "../middlewares/ErrorHandlers/checkAccess";
import { userRateLimiter } from "../middlewares/rateLimiter";

const router = Router();

// Apply JWT verification and rate limiting to all routes
router.use(verifyJWT);
router.use(userRateLimiter);

/**
 * @swagger
 * tags:
 *   name: Audit Log
 *   description: Audit log and activity tracking endpoints (token required)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       required:
 *         - type
 *         - action
 *         - entity
 *         - entityId
 *         - userId
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated UUID of the audit log entry
 *         type:
 *           type: string
 *           enum: [user, shop, product, category, flavor, restock, billing, notification, system]
 *           description: Type of entity being audited
 *         action:
 *           type: string
 *           enum: [created, updated, deleted, status_changed, logged_in, logged_out, accessed, approved, rejected, fulfilled]
 *           description: Action performed
 *         entity:
 *           type: string
 *           description: Name of the entity
 *         entityId:
 *           type: string
 *           description: ID of the entity
 *         userId:
 *           type: string
 *           description: ID of the user who performed the action
 *         shopId:
 *           type: string
 *           description: ID of the shop (if applicable)
 *         meta:
 *           type: object
 *           description: Additional metadata about the action
 *           properties:
 *             details:
 *               type: string
 *             amount:
 *               type: number
 *             status:
 *               type: string
 *             shopName:
 *               type: string
 *             productId:
 *               type: string
 *             requestedAmount:
 *               type: integer
 *         ipAddress:
 *           type: string
 *           description: IP address of the user
 *         userAgent:
 *           type: string
 *           description: User agent string
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *       example:
 *         id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *         type: "product"
 *         action: "created"
 *         entity: "Product"
 *         entityId: "product-123"
 *         userId: "user-456"
 *         shopId: "shop-789"
 *         meta:
 *           details: "Created new product: Vanilla Ice Cream"
 *           amount: 50
 *         ipAddress: "192.168.1.1"
 *         userAgent: "Mozilla/5.0..."
 *         createdAt: "2023-05-16T10:30:00Z"
 *     AuditLogStats:
 *       type: object
 *       properties:
 *         totalEntries:
 *           type: integer
 *           description: Total number of audit log entries
 *         entriesByType:
 *           type: object
 *           description: Count of entries by type
 *           additionalProperties:
 *             type: integer
 *         entriesByAction:
 *           type: object
 *           description: Count of entries by action
 *           additionalProperties:
 *             type: integer
 *         recentActivity:
 *           type: array
 *           description: Recent audit log entries
 *           items:
 *             $ref: '#/components/schemas/AuditLog'
 *         topUsers:
 *           type: array
 *           description: Users with most activity
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               count:
 *                 type: integer
 *               userName:
 *                 type: string
 */

/**
 * @swagger
 * /api/audit-log:
 *   get:
 *     summary: Get audit log entries
 *     description: Retrieve audit log entries with pagination and filtering. Access is restricted based on user permissions.
 *     tags: [Audit Log]
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
 *         description: Number of entries per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [user, shop, product, category, flavor, restock, billing, notification, system]
 *         description: Filter by audit log type
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [created, updated, deleted, status_changed, logged_in, logged_out, accessed, approved, rejected, fulfilled]
 *         description: Filter by action
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
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
 *         description: Filter by start date (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Audit log entries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
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
router.get(
  "/",
  checkAccess("Audit Log", "read"),
  AuditLogController.getAuditLog as unknown as RequestHandler
);

/**
 * @swagger
 * /api/audit-log/stats:
 *   get:
 *     summary: Get audit log statistics
 *     description: Retrieve audit log statistics and analytics. Access is restricted based on user permissions.
 *     tags: [Audit Log]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Audit log statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditLogStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get(
  "/stats",
  checkAccess("Audit Log", "read"),
  AuditLogController.getAuditLogStats as unknown as RequestHandler
);

export default router;

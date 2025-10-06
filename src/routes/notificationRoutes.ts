import express from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  listNotifications,
  markNotificationRead,
  markAllRead,
  getAllNotifications,
  createNotification,
  sseSubscribe,
  clearNotification,
  clearAllNotifications,
  createNotificationEndpoint,
  createBulkNotificationEndpoint,
  createRoleNotificationEndpoint,
  getNotificationTypes,
} from "../controllers/NotificationsController";

const notificationRoutes = express.Router();

// all routes secured
notificationRoutes.use(authenticateToken as any);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management endpoints (token required)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - userId
 *         - type
 *         - message
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated UUID of the notification
 *         userId:
 *           type: string
 *           description: ID of the user who receives the notification
 *         type:
 *           type: string
 *           enum: [RESTOCK_REQUEST, INVENTORY_ADD_REQUEST, LOW_STOCK_ALERT, PRODUCT_CREATED, PRODUCT_UPDATED, BILLING_CREATED, SYSTEM_ALERT]
 *           description: Type of notification
 *         message:
 *           type: string
 *           description: Notification message content
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read
 *           default: false
 *         hidden:
 *           type: boolean
 *           description: Whether the notification is hidden
 *           default: false
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
 *         userId: "user-123"
 *         type: "RESTOCK_REQUEST"
 *         message: "New restock request: 50 units of Vanilla Ice Cream"
 *         isRead: false
 *         hidden: false
 *         createdAt: "2023-05-16T10:30:00Z"
 *         updatedAt: "2023-05-16T10:30:00Z"
 *     NotificationCreate:
 *       type: object
 *       required:
 *         - userId
 *         - type
 *         - message
 *       properties:
 *         userId:
 *           type: string
 *           description: ID of the user who receives the notification
 *         type:
 *           type: string
 *           enum: [RESTOCK_REQUEST, INVENTORY_ADD_REQUEST, LOW_STOCK_ALERT, PRODUCT_CREATED, PRODUCT_UPDATED, BILLING_CREATED, SYSTEM_ALERT]
 *           description: Type of notification
 *         message:
 *           type: string
 *           description: Notification message content
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve all notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
notificationRoutes.get("/", listNotifications);

/**
 * @swagger
 * /api/notifications/admin/all:
 *   get:
 *     summary: Get all notifications (Admin only)
 *     description: Retrieve all notifications across all users. Only accessible by Admin users.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
notificationRoutes.get("/admin/all", getAllNotifications);

/**
 * @swagger
 * /api/notifications/create:
 *   post:
 *     summary: Create a new notification
 *     description: Create a new notification for a specific user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationCreate'
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
notificationRoutes.post("/create", createNotification);

/**
 * @swagger
 * /api/notifications/read/{id}:
 *   post:
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
notificationRoutes.post("/read/:id", markNotificationRead);

/**
 * @swagger
 * /api/notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     description: Mark all notifications as read for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "All notifications marked as read"
 *                 count:
 *                   type: integer
 *                   description: Number of notifications marked as read
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
notificationRoutes.post("/read-all", markAllRead);

/**
 * @swagger
 * /api/notifications/clear/{id}:
 *   post:
 *     summary: Clear a notification
 *     description: Hide a specific notification for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
notificationRoutes.post("/clear/:id", clearNotification);

/**
 * @swagger
 * /api/notifications/clear-all:
 *   post:
 *     summary: Clear all notifications
 *     description: Hide all notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "All notifications cleared"
 *                 count:
 *                   type: integer
 *                   description: Number of notifications cleared
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
notificationRoutes.post("/clear-all", clearAllNotifications);

/**
 * @swagger
 * /api/notifications/stream:
 *   get:
 *     summary: Subscribe to notification stream
 *     description: Server-Sent Events (SSE) endpoint for real-time notifications. Establishes a persistent connection for live updates.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SSE connection established successfully
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-sent events stream
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
notificationRoutes.get("/stream", sseSubscribe);

/**
 * @swagger
 * /api/notifications/types:
 *   get:
 *     summary: Get notification types and categories
 *     description: Retrieve all available notification types, priorities, and categories
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 types:
 *                   type: object
 *                   description: Available notification types
 *                 priorities:
 *                   type: object
 *                   description: Available priority levels
 *                 categories:
 *                   type: object
 *                   description: Available notification categories
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
notificationRoutes.get("/types", getNotificationTypes);

/**
 * @swagger
 * /api/notifications/enhanced/create:
 *   post:
 *     summary: Create enhanced notification
 *     description: Create a notification with enhanced features including priority, category, and delivery options
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - message
 *             properties:
 *               type:
 *                 type: string
 *                 description: Notification type
 *               message:
 *                 type: string
 *                 description: Notification message
 *               title:
 *                 type: string
 *                 description: Optional notification title
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                 description: Notification priority
 *               category:
 *                 type: string
 *                 enum: [INVENTORY, SHOP_MANAGEMENT, BILLING, SYSTEM, SECURITY, PRODUCTS, GENERAL]
 *                 description: Notification category
 *               sendEmail:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to send email notification
 *               sendWebSocket:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to send WebSocket notification
 *               sendSSE:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to send SSE notification
 *     responses:
 *       201:
 *         description: Enhanced notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
notificationRoutes.post("/enhanced/create", createNotificationEndpoint);

/**
 * @swagger
 * /api/notifications/bulk/create:
 *   post:
 *     summary: Create bulk notifications
 *     description: Create notifications for multiple users
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - type
 *               - message
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to send notifications to
 *               type:
 *                 type: string
 *                 description: Notification type
 *               message:
 *                 type: string
 *                 description: Notification message
 *               title:
 *                 type: string
 *                 description: Optional notification title
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                 description: Notification priority
 *               category:
 *                 type: string
 *                 enum: [INVENTORY, SHOP_MANAGEMENT, BILLING, SYSTEM, SECURITY, PRODUCTS, GENERAL]
 *                 description: Notification category
 *               sendEmail:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to send email notification
 *               sendWebSocket:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to send WebSocket notification
 *               sendSSE:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to send SSE notification
 *     responses:
 *       201:
 *         description: Bulk notifications created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
notificationRoutes.post("/bulk/create", createBulkNotificationEndpoint);

/**
 * @swagger
 * /api/notifications/role/create:
 *   post:
 *     summary: Create role-based notifications
 *     description: Create notifications for all users with a specific role
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - type
 *               - message
 *             properties:
 *               role:
 *                 type: string
 *                 description: User role to send notifications to
 *               type:
 *                 type: string
 *                 description: Notification type
 *               message:
 *                 type: string
 *                 description: Notification message
 *               title:
 *                 type: string
 *                 description: Optional notification title
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                 description: Notification priority
 *               category:
 *                 type: string
 *                 enum: [INVENTORY, SHOP_MANAGEMENT, BILLING, SYSTEM, SECURITY, PRODUCTS, GENERAL]
 *                 description: Notification category
 *               sendEmail:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to send email notification
 *               sendWebSocket:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to send WebSocket notification
 *               sendSSE:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to send SSE notification
 *     responses:
 *       201:
 *         description: Role-based notifications created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 count:
 *                   type: integer
 *                   description: Number of notifications created
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
notificationRoutes.post("/role/create", createRoleNotificationEndpoint);

export default notificationRoutes;



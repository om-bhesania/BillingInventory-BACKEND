"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllRead = markAllRead;
exports.getAllNotifications = getAllNotifications;
exports.createNotification = createNotification;
exports.sseSubscribe = sseSubscribe;
exports.emitUserNotification = emitUserNotification;
exports.emitLiveNotification = emitLiveNotification;
exports.clearNotification = clearNotification;
exports.clearAllNotifications = clearAllNotifications;
exports.createNotificationEndpoint = createNotificationEndpoint;
exports.createBulkNotificationEndpoint = createBulkNotificationEndpoint;
exports.createRoleNotificationEndpoint = createRoleNotificationEndpoint;
exports.getNotificationTypes = getNotificationTypes;
const client_1 = require("@prisma/client");
const client_2 = require("../config/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const notificationService_1 = require("../services/notificationService");
const socketService_1 = require("../services/socketService");
// Prefer shared prisma to avoid multiple client instances
const prisma = client_2.prisma ?? new client_1.PrismaClient();
const userSubscribers = new Map();
async function listNotifications(req, res) {
    const user = req.user;
    if (!user?.publicId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    // Get query parameters for filtering
    const { category, priority, type } = req.query;
    // Build where clause for filtering
    const whereClause = {
        userId: user.publicId,
        hidden: false, // Exclude soft deleted notifications
    };
    // Add category filter if provided
    if (category && category !== 'all') {
        whereClause.category = category;
    }
    // Add priority filter if provided
    if (priority && priority !== 'all') {
        whereClause.priority = priority;
    }
    // Add type filter if provided
    if (type && type !== 'all') {
        whereClause.type = type;
    }
    const notifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 100,
    });
    res.json(notifications);
}
async function markNotificationRead(req, res) {
    const user = req.user;
    if (!user?.publicId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { id } = req.params;
    const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
    });
    if (updated.userId !== user.publicId) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    res.json(updated);
}
async function markAllRead(req, res) {
    const user = req.user;
    if (!user?.publicId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    await prisma.notification.updateMany({
        where: { userId: user.publicId, isRead: false },
        data: { isRead: true },
    });
    res.json({ success: true });
}
// Admin-only endpoint to get all notifications including LOGIN_EVENT
async function getAllNotifications(req, res) {
    const user = req.user;
    if (!user?.publicId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    // Check if user is admin
    const userRole = await prisma.role.findFirst({
        where: {
            users: { some: { publicId: user.publicId } },
            name: "Admin"
        },
    });
    if (!userRole) {
        res.status(403).json({ message: "Admin access required" });
        return;
    }
    // Get query parameters
    const { includeHidden = "false" } = req.query;
    const shouldIncludeHidden = includeHidden === "true";
    const notifications = await prisma.notification.findMany({
        where: {
            // Only include hidden notifications if explicitly requested
            ...(shouldIncludeHidden ? {} : { hidden: false })
        },
        orderBy: { createdAt: "desc" },
        take: 1000, // Allow more notifications for admin
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
    res.json(notifications);
}
async function createNotification(req, res) {
    // Optional admin/system route to create a notification for a user
    const user = req.user;
    if (!user?.publicId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { userId, type, message, category = "SYSTEM", priority = "MEDIUM", metadata } = req.body;
    // Only allow creating for self unless you add role checks
    if (userId !== user.publicId) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    const created = await prisma.notification.create({
        data: {
            userId,
            type,
            message,
            category,
            priority,
            metadata: metadata ? JSON.stringify(metadata) : undefined
        },
    });
    // Push to SSE subscribers for that user
    const subs = userSubscribers.get(userId);
    if (subs) {
        const payload = `data: ${JSON.stringify({ event: "created", notification: created })}\n\n`;
        subs.forEach((c) => c.res.write(payload));
    }
    res.status(201).json(created);
}
async function sseSubscribe(req, res) {
    let userPublicId = req.user?.publicId;
    // Support EventSource by accepting token in query param when Authorization header is not present
    if (!userPublicId) {
        const token = req.query.token || "";
        if (!token) {
            res.status(401).end();
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            userPublicId = decoded?.publicId;
        }
        catch {
            res.status(401).end();
            return;
        }
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const client = { res };
    (0, notificationService_1.addSubscriber)(userPublicId, client);
    // Send a comment/ping to keep connection open
    res.write(`: connected\n\n`);
    req.on("close", () => {
        (0, notificationService_1.removeSubscriber)(userPublicId, client);
        res.end();
    });
}
// Helper to emit from other controllers (can be imported where needed)
async function emitUserNotification(userPublicId, payload) {
    // Use Socket.IO for real-time notifications
    const socketService = (0, socketService_1.getSocketService)();
    socketService.emitToUser(userPublicId, 'notification:new', payload);
    // Keep SSE as fallback for legacy support
    const subs = userSubscribers.get(userPublicId);
    if (subs) {
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        subs.forEach((c) => c.res.write(data));
    }
}
// Comprehensive notification emission for live updates
async function emitLiveNotification(type, data, targetUsers) {
    const socketService = (0, socketService_1.getSocketService)();
    // Create notification payload
    const notificationPayload = {
        event: `${type}_update`,
        notification: {
            type: type.toUpperCase(),
            message: data.message || `${type} updated`,
            timestamp: new Date().toISOString(),
            data: data
        }
    };
    if (targetUsers && targetUsers.length > 0) {
        // Send to specific users
        targetUsers.forEach(userId => {
            socketService.emitToUser(userId, 'notification:new', notificationPayload);
        });
    }
    else {
        // Broadcast to all connected users
        socketService.emitToAll('notification:new', notificationPayload);
    }
}
// Clear individual notification (hard delete - remove from DB)
async function clearNotification(req, res) {
    const user = req.user;
    if (!user?.publicId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { id } = req.params;
    try {
        // Check if notification exists and belongs to user
        const notification = await prisma.notification.findUnique({
            where: { id },
            select: { id: true, userId: true }
        });
        if (!notification) {
            res.status(404).json({ message: "Notification not found" });
            return;
        }
        if (notification.userId !== user.publicId) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }
        // Hard delete from database
        await prisma.notification.delete({
            where: { id }
        });
        // Emit real-time notification via Socket.IO
        const socketService = (0, socketService_1.getSocketService)();
        socketService.emitToUser(user.publicId, 'notification:cleared', { notificationId: id });
        // Keep SSE as fallback
        const subs = userSubscribers.get(user.publicId);
        if (subs) {
            const payload = `data: ${JSON.stringify({ event: "cleared", notificationId: id })}\n\n`;
            subs.forEach((c) => c.res.write(payload));
        }
        res.json({ success: true, message: "Notification deleted" });
    }
    catch (error) {
        console.error("Error clearing notification:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Clear all notifications for a user (hard delete - remove from DB)
async function clearAllNotifications(req, res) {
    const user = req.user;
    if (!user?.publicId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        // Hard delete all notifications from database
        await prisma.notification.deleteMany({
            where: {
                userId: user.publicId
            }
        });
        // Emit real-time notification via Socket.IO
        const socketService = (0, socketService_1.getSocketService)();
        socketService.emitToUser(user.publicId, 'notification:cleared_all', {});
        // Keep SSE as fallback
        const subs = userSubscribers.get(user.publicId);
        if (subs) {
            const payload = `data: ${JSON.stringify({ event: "cleared_all" })}\n\n`;
            subs.forEach((c) => c.res.write(payload));
        }
        res.json({ success: true, message: "All notifications deleted" });
    }
    catch (error) {
        console.error("Error clearing all notifications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Enhanced notification creation endpoint
async function createNotificationEndpoint(req, res) {
    try {
        const user = req.user;
        if (!user?.publicId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { type, message, title, metadata, priority, category, sendEmail = false, sendWebSocket = true, sendSSE = true } = req.body;
        if (!type || !message) {
            res.status(400).json({ message: "Type and message are required" });
            return;
        }
        const notification = await (0, notificationService_1.createNotification)({
            userId: user.publicId,
            type,
            message,
            title,
            metadata,
            priority,
            category,
            sendEmail,
            sendWebSocket,
            sendSSE
        });
        res.status(201).json(notification);
    }
    catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Create notification for multiple users
async function createBulkNotificationEndpoint(req, res) {
    try {
        const user = req.user;
        if (!user?.publicId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { userIds, type, message, title, metadata, priority, category, sendEmail = false, sendWebSocket = true, sendSSE = true } = req.body;
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            res.status(400).json({ message: "UserIds array is required" });
            return;
        }
        if (!type || !message) {
            res.status(400).json({ message: "Type and message are required" });
            return;
        }
        const notifications = await (0, notificationService_1.createBulkNotification)({
            userIds,
            type,
            message,
            title,
            metadata,
            priority,
            category,
            sendEmail,
            sendWebSocket,
            sendSSE
        });
        res.status(201).json({
            message: `Notifications created for ${notifications.length} users`,
            notifications
        });
    }
    catch (error) {
        console.error('Error creating bulk notifications:', error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Create notification for role
async function createRoleNotificationEndpoint(req, res) {
    try {
        const user = req.user;
        if (!user?.publicId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { role, type, message, title, metadata, priority, category, sendEmail = false, sendWebSocket = true, sendSSE = true } = req.body;
        if (!role || !type || !message) {
            res.status(400).json({ message: "Role, type, and message are required" });
            return;
        }
        const notifications = await (0, notificationService_1.createRoleNotification)({
            role,
            type,
            message,
            title,
            metadata,
            priority,
            category,
            sendEmail,
            sendWebSocket,
            sendSSE
        });
        res.status(201).json({
            message: `Notifications created for role ${role}`,
            count: notifications.length,
            notifications
        });
    }
    catch (error) {
        console.error('Error creating role notifications:', error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Get notification types and categories
async function getNotificationTypes(req, res) {
    res.json({
        types: notificationService_1.NOTIFICATION_TYPES,
        priorities: notificationService_1.NOTIFICATION_PRIORITY,
        categories: notificationService_1.NOTIFICATION_CATEGORIES
    });
}

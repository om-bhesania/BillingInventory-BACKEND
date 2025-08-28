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
exports.clearNotification = clearNotification;
exports.clearAllNotifications = clearAllNotifications;
const client_1 = require("@prisma/client");
const client_2 = require("../config/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Prefer shared prisma to avoid multiple client instances
const prisma = client_2.prisma ?? new client_1.PrismaClient();
const userSubscribers = new Map();
function addSubscriber(userPublicId, client) {
    if (!userSubscribers.has(userPublicId)) {
        userSubscribers.set(userPublicId, new Set());
    }
    userSubscribers.get(userPublicId).add(client);
}
function removeSubscriber(userPublicId, client) {
    const set = userSubscribers.get(userPublicId);
    if (set) {
        set.delete(client);
        if (set.size === 0)
            userSubscribers.delete(userPublicId);
    }
}
async function listNotifications(req, res) {
    const user = req.user;
    if (!user?.publicId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    // Only show stock status and restock request notifications for UI
    // Exclude hidden notifications (soft deleted)
    const notifications = await prisma.notification.findMany({
        where: {
            userId: user.publicId,
            hidden: false, // Exclude soft deleted notifications
            type: {
                in: ["LOW_STOCK_ALERT", "RESTOCK_REQUEST", "RESTOCK_APPROVED", "RESTOCK_REJECTED"]
            }
        },
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
    const { userId, type, message } = req.body;
    // Only allow creating for self unless you add role checks
    if (userId !== user.publicId) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    const created = await prisma.notification.create({
        data: { userId, type, message },
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
    addSubscriber(userPublicId, client);
    // Send a comment/ping to keep connection open
    res.write(`: connected\n\n`);
    req.on("close", () => {
        removeSubscriber(userPublicId, client);
        res.end();
    });
}
// Helper to emit from other controllers (can be imported where needed)
async function emitUserNotification(userPublicId, payload) {
    const subs = userSubscribers.get(userPublicId);
    if (subs) {
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        subs.forEach((c) => c.res.write(data));
    }
}
// Clear individual notification (soft delete - hide from UI but keep in DB)
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
        // Soft delete by setting hidden to true
        await prisma.notification.update({
            where: { id },
            data: { hidden: true }
        });
        // Push to SSE subscribers for that user to remove from UI
        const subs = userSubscribers.get(user.publicId);
        if (subs) {
            const payload = `data: ${JSON.stringify({ event: "cleared", notificationId: id })}\n\n`;
            subs.forEach((c) => c.res.write(payload));
        }
        res.json({ success: true, message: "Notification cleared" });
    }
    catch (error) {
        console.error("Error clearing notification:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Clear all notifications for a user (soft delete - hide from UI but keep in DB)
async function clearAllNotifications(req, res) {
    const user = req.user;
    if (!user?.publicId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        // Soft delete all notifications by setting hidden to true
        await prisma.notification.updateMany({
            where: {
                userId: user.publicId,
                hidden: false // Only update non-hidden notifications
            },
            data: { hidden: true }
        });
        // Push to SSE subscribers for that user to clear all from UI
        const subs = userSubscribers.get(user.publicId);
        if (subs) {
            const payload = `data: ${JSON.stringify({ event: "cleared_all" })}\n\n`;
            subs.forEach((c) => c.res.write(payload));
        }
        res.json({ success: true, message: "All notifications cleared" });
    }
    catch (error) {
        console.error("Error clearing all notifications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_CATEGORIES = exports.NOTIFICATION_PRIORITY = exports.NOTIFICATION_TYPES = void 0;
exports.getNotificationPriority = getNotificationPriority;
exports.getNotificationCategory = getNotificationCategory;
exports.createNotification = createNotification;
exports.createBulkNotification = createBulkNotification;
exports.createRoleNotification = createRoleNotification;
exports.emitUserNotification = emitUserNotification;
exports.addSubscriber = addSubscriber;
exports.removeSubscriber = removeSubscriber;
const client_1 = require("@prisma/client");
const client_2 = require("../config/client");
const websocketService_1 = require("./websocketService");
const prisma = client_2.prisma ?? new client_1.PrismaClient();
// Enhanced notification types with better categorization
exports.NOTIFICATION_TYPES = {
    // Inventory & Stock Management
    LOW_STOCK_ALERT: 'LOW_STOCK_ALERT',
    RESTOCK_REQUEST: 'RESTOCK_REQUEST',
    RESTOCK_APPROVED: 'RESTOCK_APPROVED',
    RESTOCK_REJECTED: 'RESTOCK_REJECTED',
    INVENTORY_ADD_REQUEST: 'INVENTORY_ADD_REQUEST',
    INVENTORY_UPDATED: 'INVENTORY_UPDATED',
    // Shop Management
    SHOP_CREATED: 'SHOP_CREATED',
    SHOP_UPDATED: 'SHOP_UPDATED',
    SHOP_DEACTIVATED: 'SHOP_DEACTIVATED',
    MANAGER_ASSIGNED: 'MANAGER_ASSIGNED',
    MANAGER_UNASSIGNED: 'MANAGER_UNASSIGNED',
    // Billing & Sales
    BILLING_CREATED: 'BILLING_CREATED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
    // System & Security
    SYSTEM_ALERT: 'SYSTEM_ALERT',
    SECURITY_ALERT: 'SECURITY_ALERT',
    LOGIN_EVENT: 'LOGIN_EVENT',
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    // Product Management
    PRODUCT_CREATED: 'PRODUCT_CREATED',
    PRODUCT_UPDATED: 'PRODUCT_UPDATED',
    PRODUCT_DISCONTINUED: 'PRODUCT_DISCONTINUED',
    // General
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    SUCCESS: 'SUCCESS'
};
// Notification priority levels
exports.NOTIFICATION_PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};
// Notification categories for better organization
exports.NOTIFICATION_CATEGORIES = {
    INVENTORY: 'INVENTORY',
    SHOP_MANAGEMENT: 'SHOP_MANAGEMENT',
    BILLING: 'BILLING',
    SYSTEM: 'SYSTEM',
    SECURITY: 'SECURITY',
    PRODUCTS: 'PRODUCTS',
    GENERAL: 'GENERAL'
};
// Get priority based on notification type
function getNotificationPriority(type) {
    const priorityMap = {
        [exports.NOTIFICATION_TYPES.LOW_STOCK_ALERT]: exports.NOTIFICATION_PRIORITY.HIGH,
        [exports.NOTIFICATION_TYPES.RESTOCK_REQUEST]: exports.NOTIFICATION_PRIORITY.MEDIUM,
        [exports.NOTIFICATION_TYPES.RESTOCK_APPROVED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.RESTOCK_REJECTED]: exports.NOTIFICATION_PRIORITY.MEDIUM,
        [exports.NOTIFICATION_TYPES.INVENTORY_ADD_REQUEST]: exports.NOTIFICATION_PRIORITY.MEDIUM,
        [exports.NOTIFICATION_TYPES.INVENTORY_UPDATED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.SHOP_CREATED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.SHOP_UPDATED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.SHOP_DEACTIVATED]: exports.NOTIFICATION_PRIORITY.MEDIUM,
        [exports.NOTIFICATION_TYPES.MANAGER_ASSIGNED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.MANAGER_UNASSIGNED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.BILLING_CREATED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.PAYMENT_RECEIVED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.PAYMENT_OVERDUE]: exports.NOTIFICATION_PRIORITY.HIGH,
        [exports.NOTIFICATION_TYPES.SYSTEM_ALERT]: exports.NOTIFICATION_PRIORITY.CRITICAL,
        [exports.NOTIFICATION_TYPES.SECURITY_ALERT]: exports.NOTIFICATION_PRIORITY.CRITICAL,
        [exports.NOTIFICATION_TYPES.LOGIN_EVENT]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.USER_CREATED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.USER_UPDATED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.PRODUCT_CREATED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.PRODUCT_UPDATED]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.PRODUCT_DISCONTINUED]: exports.NOTIFICATION_PRIORITY.MEDIUM,
        [exports.NOTIFICATION_TYPES.INFO]: exports.NOTIFICATION_PRIORITY.LOW,
        [exports.NOTIFICATION_TYPES.WARNING]: exports.NOTIFICATION_PRIORITY.MEDIUM,
        [exports.NOTIFICATION_TYPES.ERROR]: exports.NOTIFICATION_PRIORITY.HIGH,
        [exports.NOTIFICATION_TYPES.SUCCESS]: exports.NOTIFICATION_PRIORITY.LOW
    };
    return priorityMap[type] || exports.NOTIFICATION_PRIORITY.LOW;
}
// Get category based on notification type
function getNotificationCategory(type) {
    const categoryMap = {
        [exports.NOTIFICATION_TYPES.LOW_STOCK_ALERT]: exports.NOTIFICATION_CATEGORIES.INVENTORY,
        [exports.NOTIFICATION_TYPES.RESTOCK_REQUEST]: exports.NOTIFICATION_CATEGORIES.INVENTORY,
        [exports.NOTIFICATION_TYPES.RESTOCK_APPROVED]: exports.NOTIFICATION_CATEGORIES.INVENTORY,
        [exports.NOTIFICATION_TYPES.RESTOCK_REJECTED]: exports.NOTIFICATION_CATEGORIES.INVENTORY,
        [exports.NOTIFICATION_TYPES.INVENTORY_ADD_REQUEST]: exports.NOTIFICATION_CATEGORIES.INVENTORY,
        [exports.NOTIFICATION_TYPES.INVENTORY_UPDATED]: exports.NOTIFICATION_CATEGORIES.INVENTORY,
        [exports.NOTIFICATION_TYPES.SHOP_CREATED]: exports.NOTIFICATION_CATEGORIES.SHOP_MANAGEMENT,
        [exports.NOTIFICATION_TYPES.SHOP_UPDATED]: exports.NOTIFICATION_CATEGORIES.SHOP_MANAGEMENT,
        [exports.NOTIFICATION_TYPES.SHOP_DEACTIVATED]: exports.NOTIFICATION_CATEGORIES.SHOP_MANAGEMENT,
        [exports.NOTIFICATION_TYPES.MANAGER_ASSIGNED]: exports.NOTIFICATION_CATEGORIES.SHOP_MANAGEMENT,
        [exports.NOTIFICATION_TYPES.MANAGER_UNASSIGNED]: exports.NOTIFICATION_CATEGORIES.SHOP_MANAGEMENT,
        [exports.NOTIFICATION_TYPES.BILLING_CREATED]: exports.NOTIFICATION_CATEGORIES.BILLING,
        [exports.NOTIFICATION_TYPES.PAYMENT_RECEIVED]: exports.NOTIFICATION_CATEGORIES.BILLING,
        [exports.NOTIFICATION_TYPES.PAYMENT_OVERDUE]: exports.NOTIFICATION_CATEGORIES.BILLING,
        [exports.NOTIFICATION_TYPES.SYSTEM_ALERT]: exports.NOTIFICATION_CATEGORIES.SYSTEM,
        [exports.NOTIFICATION_TYPES.SECURITY_ALERT]: exports.NOTIFICATION_CATEGORIES.SECURITY,
        [exports.NOTIFICATION_TYPES.LOGIN_EVENT]: exports.NOTIFICATION_CATEGORIES.SECURITY,
        [exports.NOTIFICATION_TYPES.USER_CREATED]: exports.NOTIFICATION_CATEGORIES.SYSTEM,
        [exports.NOTIFICATION_TYPES.USER_UPDATED]: exports.NOTIFICATION_CATEGORIES.SYSTEM,
        [exports.NOTIFICATION_TYPES.PRODUCT_CREATED]: exports.NOTIFICATION_CATEGORIES.PRODUCTS,
        [exports.NOTIFICATION_TYPES.PRODUCT_UPDATED]: exports.NOTIFICATION_CATEGORIES.PRODUCTS,
        [exports.NOTIFICATION_TYPES.PRODUCT_DISCONTINUED]: exports.NOTIFICATION_CATEGORIES.PRODUCTS,
        [exports.NOTIFICATION_TYPES.INFO]: exports.NOTIFICATION_CATEGORIES.GENERAL,
        [exports.NOTIFICATION_TYPES.WARNING]: exports.NOTIFICATION_CATEGORIES.GENERAL,
        [exports.NOTIFICATION_TYPES.ERROR]: exports.NOTIFICATION_CATEGORIES.GENERAL,
        [exports.NOTIFICATION_TYPES.SUCCESS]: exports.NOTIFICATION_CATEGORIES.GENERAL
    };
    return categoryMap[type] || exports.NOTIFICATION_CATEGORIES.GENERAL;
}
// Enhanced notification creation with real-time delivery
async function createNotification(data) {
    try {
        const { userId, type, message, title, metadata, priority = getNotificationPriority(type), category = getNotificationCategory(type), sendEmail = false, sendWebSocket = true, sendSSE = true } = data;
        // Create notification in database
        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                message,
                isRead: false,
                hidden: false
            }
        });
        // Enhanced notification object for real-time delivery
        const enhancedNotification = {
            ...notification,
            title: title || getDefaultTitle(type),
            priority,
            category,
            metadata: metadata || null
        };
        // Send via WebSocket
        if (sendWebSocket) {
            const wsService = (0, websocketService_1.getWebSocketService)();
            if (wsService) {
                wsService.sendNotificationToUser(userId, {
                    event: 'notification:new',
                    notification: enhancedNotification
                });
            }
        }
        // Send via SSE (existing functionality)
        if (sendSSE) {
            emitUserNotification(userId, {
                event: 'created',
                notification: enhancedNotification
            });
        }
        // Send email notification for critical alerts
        if (sendEmail && (priority === exports.NOTIFICATION_PRIORITY.CRITICAL || priority === exports.NOTIFICATION_PRIORITY.HIGH)) {
            // TODO: Implement email notification service
            console.log(`📧 Email notification would be sent for: ${type}`);
        }
        return enhancedNotification;
    }
    catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}
// Create notification for multiple users
async function createBulkNotification(data) {
    const notifications = [];
    for (const userId of data.userIds) {
        try {
            const notification = await createNotification({
                ...data,
                userId
            });
            notifications.push(notification);
        }
        catch (error) {
            console.error(`Error creating notification for user ${userId}:`, error);
        }
    }
    return notifications;
}
// Create notification for all users with a specific role
async function createRoleNotification(data) {
    try {
        // Get all users with the specified role
        const users = await prisma.user.findMany({
            where: { role: data.role },
            select: { publicId: true }
        });
        const userIds = users.map(user => user.publicId);
        // Send to all users with the role
        const notifications = await createBulkNotification({
            ...data,
            userIds
        });
        // Also send via WebSocket to role-based room
        const wsService = (0, websocketService_1.getWebSocketService)();
        if (wsService && data.sendWebSocket !== false) {
            wsService.sendNotificationToRole(data.role, {
                event: 'notification:new',
                notification: {
                    type: data.type,
                    message: data.message,
                    title: data.title || getDefaultTitle(data.type),
                    priority: data.priority || getNotificationPriority(data.type),
                    category: data.category || getNotificationCategory(data.type),
                    metadata: data.metadata || null,
                    createdAt: new Date()
                }
            });
        }
        return notifications;
    }
    catch (error) {
        console.error('Error creating role notification:', error);
        throw error;
    }
}
// Get default title based on notification type
function getDefaultTitle(type) {
    const titleMap = {
        [exports.NOTIFICATION_TYPES.LOW_STOCK_ALERT]: 'Low Stock Alert',
        [exports.NOTIFICATION_TYPES.RESTOCK_REQUEST]: 'Restock Request',
        [exports.NOTIFICATION_TYPES.RESTOCK_APPROVED]: 'Restock Approved',
        [exports.NOTIFICATION_TYPES.RESTOCK_REJECTED]: 'Restock Rejected',
        [exports.NOTIFICATION_TYPES.INVENTORY_ADD_REQUEST]: 'Inventory Add Request',
        [exports.NOTIFICATION_TYPES.INVENTORY_UPDATED]: 'Inventory Updated',
        [exports.NOTIFICATION_TYPES.SHOP_CREATED]: 'New Shop Created',
        [exports.NOTIFICATION_TYPES.SHOP_UPDATED]: 'Shop Updated',
        [exports.NOTIFICATION_TYPES.SHOP_DEACTIVATED]: 'Shop Deactivated',
        [exports.NOTIFICATION_TYPES.MANAGER_ASSIGNED]: 'Manager Assigned',
        [exports.NOTIFICATION_TYPES.MANAGER_UNASSIGNED]: 'Manager Unassigned',
        [exports.NOTIFICATION_TYPES.BILLING_CREATED]: 'New Invoice Created',
        [exports.NOTIFICATION_TYPES.PAYMENT_RECEIVED]: 'Payment Received',
        [exports.NOTIFICATION_TYPES.PAYMENT_OVERDUE]: 'Payment Overdue',
        [exports.NOTIFICATION_TYPES.SYSTEM_ALERT]: 'System Alert',
        [exports.NOTIFICATION_TYPES.SECURITY_ALERT]: 'Security Alert',
        [exports.NOTIFICATION_TYPES.LOGIN_EVENT]: 'Login Event',
        [exports.NOTIFICATION_TYPES.USER_CREATED]: 'New User Created',
        [exports.NOTIFICATION_TYPES.USER_UPDATED]: 'User Updated',
        [exports.NOTIFICATION_TYPES.PRODUCT_CREATED]: 'New Product Created',
        [exports.NOTIFICATION_TYPES.PRODUCT_UPDATED]: 'Product Updated',
        [exports.NOTIFICATION_TYPES.PRODUCT_DISCONTINUED]: 'Product Discontinued',
        [exports.NOTIFICATION_TYPES.INFO]: 'Information',
        [exports.NOTIFICATION_TYPES.WARNING]: 'Warning',
        [exports.NOTIFICATION_TYPES.ERROR]: 'Error',
        [exports.NOTIFICATION_TYPES.SUCCESS]: 'Success'
    };
    return titleMap[type] || 'Notification';
}
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
function emitUserNotification(userId, payload) {
    const subs = userSubscribers.get(userId);
    if (subs) {
        const message = `data: ${JSON.stringify(payload)}\n\n`;
        subs.forEach((client) => {
            try {
                client.res.write(message);
            }
            catch (error) {
                console.error('Error sending SSE notification:', error);
                // Remove broken connection
                subs.delete(client);
            }
        });
    }
}

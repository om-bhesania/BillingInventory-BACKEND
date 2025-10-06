import { PrismaClient } from '@prisma/client';
import { prisma as sharedPrisma } from '../config/client';
import { getWebSocketService } from './websocketService';

const prisma = sharedPrisma ?? new PrismaClient();

// Enhanced notification types with better categorization
export const NOTIFICATION_TYPES = {
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
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Notification priority levels
export const NOTIFICATION_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const;

export type NotificationPriority = typeof NOTIFICATION_PRIORITY[keyof typeof NOTIFICATION_PRIORITY];

// Notification categories for better organization
export const NOTIFICATION_CATEGORIES = {
  INVENTORY: 'INVENTORY',
  SHOP_MANAGEMENT: 'SHOP_MANAGEMENT',
  BILLING: 'BILLING',
  SYSTEM: 'SYSTEM',
  SECURITY: 'SECURITY',
  PRODUCTS: 'PRODUCTS',
  GENERAL: 'GENERAL'
} as const;

export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[keyof typeof NOTIFICATION_CATEGORIES];

// Get priority based on notification type
export function getNotificationPriority(type: NotificationType): NotificationPriority {
  const priorityMap: Record<NotificationType, NotificationPriority> = {
    [NOTIFICATION_TYPES.LOW_STOCK_ALERT]: NOTIFICATION_PRIORITY.HIGH,
    [NOTIFICATION_TYPES.RESTOCK_REQUEST]: NOTIFICATION_PRIORITY.MEDIUM,
    [NOTIFICATION_TYPES.RESTOCK_APPROVED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.RESTOCK_REJECTED]: NOTIFICATION_PRIORITY.MEDIUM,
    [NOTIFICATION_TYPES.INVENTORY_ADD_REQUEST]: NOTIFICATION_PRIORITY.MEDIUM,
    [NOTIFICATION_TYPES.INVENTORY_UPDATED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.SHOP_CREATED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.SHOP_UPDATED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.SHOP_DEACTIVATED]: NOTIFICATION_PRIORITY.MEDIUM,
    [NOTIFICATION_TYPES.MANAGER_ASSIGNED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.MANAGER_UNASSIGNED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.BILLING_CREATED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: NOTIFICATION_PRIORITY.HIGH,
    [NOTIFICATION_TYPES.SYSTEM_ALERT]: NOTIFICATION_PRIORITY.CRITICAL,
    [NOTIFICATION_TYPES.SECURITY_ALERT]: NOTIFICATION_PRIORITY.CRITICAL,
    [NOTIFICATION_TYPES.LOGIN_EVENT]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.USER_CREATED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.USER_UPDATED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.PRODUCT_CREATED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.PRODUCT_UPDATED]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.PRODUCT_DISCONTINUED]: NOTIFICATION_PRIORITY.MEDIUM,
    [NOTIFICATION_TYPES.INFO]: NOTIFICATION_PRIORITY.LOW,
    [NOTIFICATION_TYPES.WARNING]: NOTIFICATION_PRIORITY.MEDIUM,
    [NOTIFICATION_TYPES.ERROR]: NOTIFICATION_PRIORITY.HIGH,
    [NOTIFICATION_TYPES.SUCCESS]: NOTIFICATION_PRIORITY.LOW
  };

  return priorityMap[type] || NOTIFICATION_PRIORITY.LOW;
}

// Get category based on notification type
export function getNotificationCategory(type: NotificationType): NotificationCategory {
  const categoryMap: Record<NotificationType, NotificationCategory> = {
    [NOTIFICATION_TYPES.LOW_STOCK_ALERT]: NOTIFICATION_CATEGORIES.INVENTORY,
    [NOTIFICATION_TYPES.RESTOCK_REQUEST]: NOTIFICATION_CATEGORIES.INVENTORY,
    [NOTIFICATION_TYPES.RESTOCK_APPROVED]: NOTIFICATION_CATEGORIES.INVENTORY,
    [NOTIFICATION_TYPES.RESTOCK_REJECTED]: NOTIFICATION_CATEGORIES.INVENTORY,
    [NOTIFICATION_TYPES.INVENTORY_ADD_REQUEST]: NOTIFICATION_CATEGORIES.INVENTORY,
    [NOTIFICATION_TYPES.INVENTORY_UPDATED]: NOTIFICATION_CATEGORIES.INVENTORY,
    [NOTIFICATION_TYPES.SHOP_CREATED]: NOTIFICATION_CATEGORIES.SHOP_MANAGEMENT,
    [NOTIFICATION_TYPES.SHOP_UPDATED]: NOTIFICATION_CATEGORIES.SHOP_MANAGEMENT,
    [NOTIFICATION_TYPES.SHOP_DEACTIVATED]: NOTIFICATION_CATEGORIES.SHOP_MANAGEMENT,
    [NOTIFICATION_TYPES.MANAGER_ASSIGNED]: NOTIFICATION_CATEGORIES.SHOP_MANAGEMENT,
    [NOTIFICATION_TYPES.MANAGER_UNASSIGNED]: NOTIFICATION_CATEGORIES.SHOP_MANAGEMENT,
    [NOTIFICATION_TYPES.BILLING_CREATED]: NOTIFICATION_CATEGORIES.BILLING,
    [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: NOTIFICATION_CATEGORIES.BILLING,
    [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: NOTIFICATION_CATEGORIES.BILLING,
    [NOTIFICATION_TYPES.SYSTEM_ALERT]: NOTIFICATION_CATEGORIES.SYSTEM,
    [NOTIFICATION_TYPES.SECURITY_ALERT]: NOTIFICATION_CATEGORIES.SECURITY,
    [NOTIFICATION_TYPES.LOGIN_EVENT]: NOTIFICATION_CATEGORIES.SECURITY,
    [NOTIFICATION_TYPES.USER_CREATED]: NOTIFICATION_CATEGORIES.SYSTEM,
    [NOTIFICATION_TYPES.USER_UPDATED]: NOTIFICATION_CATEGORIES.SYSTEM,
    [NOTIFICATION_TYPES.PRODUCT_CREATED]: NOTIFICATION_CATEGORIES.PRODUCTS,
    [NOTIFICATION_TYPES.PRODUCT_UPDATED]: NOTIFICATION_CATEGORIES.PRODUCTS,
    [NOTIFICATION_TYPES.PRODUCT_DISCONTINUED]: NOTIFICATION_CATEGORIES.PRODUCTS,
    [NOTIFICATION_TYPES.INFO]: NOTIFICATION_CATEGORIES.GENERAL,
    [NOTIFICATION_TYPES.WARNING]: NOTIFICATION_CATEGORIES.GENERAL,
    [NOTIFICATION_TYPES.ERROR]: NOTIFICATION_CATEGORIES.GENERAL,
    [NOTIFICATION_TYPES.SUCCESS]: NOTIFICATION_CATEGORIES.GENERAL
  };

  return categoryMap[type] || NOTIFICATION_CATEGORIES.GENERAL;
}

// Enhanced notification creation with real-time delivery
export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  message: string;
  title?: string;
  metadata?: any;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  sendEmail?: boolean;
  sendWebSocket?: boolean;
  sendSSE?: boolean;
}) {
  try {
    const {
      userId,
      type,
      message,
      title,
      metadata,
      priority = getNotificationPriority(type),
      category = getNotificationCategory(type),
      sendEmail = false,
      sendWebSocket = true,
      sendSSE = true
    } = data;

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
      const wsService = getWebSocketService();
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
    if (sendEmail && (priority === NOTIFICATION_PRIORITY.CRITICAL || priority === NOTIFICATION_PRIORITY.HIGH)) {
      // TODO: Implement email notification service
      console.log(`📧 Email notification would be sent for: ${type}`);
    }

    return enhancedNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Create notification for multiple users
export async function createBulkNotification(data: {
  userIds: string[];
  type: NotificationType;
  message: string;
  title?: string;
  metadata?: any;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  sendEmail?: boolean;
  sendWebSocket?: boolean;
  sendSSE?: boolean;
}) {
  const notifications = [];
  
  for (const userId of data.userIds) {
    try {
      const notification = await createNotification({
        ...data,
        userId
      });
      notifications.push(notification);
    } catch (error) {
      console.error(`Error creating notification for user ${userId}:`, error);
    }
  }

  return notifications;
}

// Create notification for all users with a specific role
export async function createRoleNotification(data: {
  role: string;
  type: NotificationType;
  message: string;
  title?: string;
  metadata?: any;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  sendEmail?: boolean;
  sendWebSocket?: boolean;
  sendSSE?: boolean;
}) {
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
    const wsService = getWebSocketService();
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
  } catch (error) {
    console.error('Error creating role notification:', error);
    throw error;
  }
}

// Get default title based on notification type
function getDefaultTitle(type: NotificationType): string {
  const titleMap: Record<NotificationType, string> = {
    [NOTIFICATION_TYPES.LOW_STOCK_ALERT]: 'Low Stock Alert',
    [NOTIFICATION_TYPES.RESTOCK_REQUEST]: 'Restock Request',
    [NOTIFICATION_TYPES.RESTOCK_APPROVED]: 'Restock Approved',
    [NOTIFICATION_TYPES.RESTOCK_REJECTED]: 'Restock Rejected',
    [NOTIFICATION_TYPES.INVENTORY_ADD_REQUEST]: 'Inventory Add Request',
    [NOTIFICATION_TYPES.INVENTORY_UPDATED]: 'Inventory Updated',
    [NOTIFICATION_TYPES.SHOP_CREATED]: 'New Shop Created',
    [NOTIFICATION_TYPES.SHOP_UPDATED]: 'Shop Updated',
    [NOTIFICATION_TYPES.SHOP_DEACTIVATED]: 'Shop Deactivated',
    [NOTIFICATION_TYPES.MANAGER_ASSIGNED]: 'Manager Assigned',
    [NOTIFICATION_TYPES.MANAGER_UNASSIGNED]: 'Manager Unassigned',
    [NOTIFICATION_TYPES.BILLING_CREATED]: 'New Invoice Created',
    [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: 'Payment Received',
    [NOTIFICATION_TYPES.PAYMENT_OVERDUE]: 'Payment Overdue',
    [NOTIFICATION_TYPES.SYSTEM_ALERT]: 'System Alert',
    [NOTIFICATION_TYPES.SECURITY_ALERT]: 'Security Alert',
    [NOTIFICATION_TYPES.LOGIN_EVENT]: 'Login Event',
    [NOTIFICATION_TYPES.USER_CREATED]: 'New User Created',
    [NOTIFICATION_TYPES.USER_UPDATED]: 'User Updated',
    [NOTIFICATION_TYPES.PRODUCT_CREATED]: 'New Product Created',
    [NOTIFICATION_TYPES.PRODUCT_UPDATED]: 'Product Updated',
    [NOTIFICATION_TYPES.PRODUCT_DISCONTINUED]: 'Product Discontinued',
    [NOTIFICATION_TYPES.INFO]: 'Information',
    [NOTIFICATION_TYPES.WARNING]: 'Warning',
    [NOTIFICATION_TYPES.ERROR]: 'Error',
    [NOTIFICATION_TYPES.SUCCESS]: 'Success'
  };

  return titleMap[type] || 'Notification';
}

// Legacy SSE support (keeping existing functionality)
type SSEClient = { res: any };
const userSubscribers: Map<string, Set<SSEClient>> = new Map();

function addSubscriber(userPublicId: string, client: SSEClient) {
  if (!userSubscribers.has(userPublicId)) {
    userSubscribers.set(userPublicId, new Set());
  }
  userSubscribers.get(userPublicId)!.add(client);
}

function removeSubscriber(userPublicId: string, client: SSEClient) {
  const set = userSubscribers.get(userPublicId);
  if (set) {
    set.delete(client);
    if (set.size === 0) userSubscribers.delete(userPublicId);
  }
}

export function emitUserNotification(userId: string, payload: any) {
  const subs = userSubscribers.get(userId);
  if (subs) {
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    subs.forEach((client) => {
      try {
        client.res.write(message);
      } catch (error) {
        console.error('Error sending SSE notification:', error);
        // Remove broken connection
        subs.delete(client);
      }
    });
  }
}

export { addSubscriber, removeSubscriber };

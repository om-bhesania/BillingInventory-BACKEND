import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { prisma as sharedPrisma } from "../config/client";
import jwt from "jsonwebtoken";
import { 
  createNotification as createNotificationService, 
  createBulkNotification, 
  createRoleNotification,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_CATEGORIES,
  addSubscriber,
  removeSubscriber,
  emitUserNotification as emitUserNotificationService
} from "../services/notificationService";
import { getSocketService } from "../services/socketService";

// Prefer shared prisma to avoid multiple client instances
const prisma = sharedPrisma ?? new PrismaClient();

// Legacy SSE support (keeping existing functionality)
type SSEClient = { res: Response };
const userSubscribers: Map<string, Set<SSEClient>> = new Map();

export async function listNotifications(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user?.publicId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  
  // Get query parameters for filtering
  const { category, priority, type } = req.query;
  
  // Build where clause for filtering
  const whereClause: any = {
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

export async function markNotificationRead(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user?.publicId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const { id } = req.params as { id: string };
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

export async function markAllRead(req: Request, res: Response) {
  const user = (req as any).user;
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
export async function getAllNotifications(req: Request, res: Response) {
  const user = (req as any).user;
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

export async function createNotification(req: Request, res: Response) {
  // Optional admin/system route to create a notification for a user
  const user = (req as any).user;
  if (!user?.publicId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const { 
    userId, 
    type, 
    message, 
    category = "SYSTEM", 
    priority = "MEDIUM", 
    metadata 
  } = req.body as {
    userId: string;
    type: string;
    message: string;
    category?: string;
    priority?: string;
    metadata?: any;
  };
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

export async function sseSubscribe(req: Request, res: Response) {
  let userPublicId: string | undefined = (req as any).user?.publicId;
  // Support EventSource by accepting token in query param when Authorization header is not present
  if (!userPublicId) {
    const token = (req.query.token as string) || "";
    if (!token) {
      res.status(401).end();
      return;
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      userPublicId = decoded?.publicId as string | undefined;
    } catch {
      res.status(401).end();
      return;
    }
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const client: SSEClient = { res };
  addSubscriber(userPublicId!, client);

  // Send a comment/ping to keep connection open
  res.write(`: connected\n\n`);

  req.on("close", () => {
    removeSubscriber(userPublicId!, client);
    res.end();
  });
}

// Helper to emit from other controllers (can be imported where needed)
export async function emitUserNotification(userPublicId: string, payload: any) {
  // Use Socket.IO for real-time notifications
  const socketService = getSocketService();
  socketService.emitToUser(userPublicId, 'notification:new', payload);
  
  // Keep SSE as fallback for legacy support
  const subs = userSubscribers.get(userPublicId);
  if (subs) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    subs.forEach((c) => c.res.write(data));
  }
}

// Comprehensive notification emission for live updates
export async function emitLiveNotification(type: string, data: any, targetUsers?: string[]) {
  const socketService = getSocketService();
  
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
  } else {
    // Broadcast to all connected users
    socketService.emitToAll('notification:new', notificationPayload);
  }
}

// Clear individual notification (hard delete - remove from DB)
export async function clearNotification(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user?.publicId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  
  const { id } = req.params as { id: string };
  
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
    const socketService = getSocketService();
    socketService.emitToUser(user.publicId, 'notification:cleared', { notificationId: id });
    
    // Keep SSE as fallback
    const subs = userSubscribers.get(user.publicId);
    if (subs) {
      const payload = `data: ${JSON.stringify({ event: "cleared", notificationId: id })}\n\n`;
      subs.forEach((c) => c.res.write(payload));
    }
    
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("Error clearing notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Clear all notifications for a user (hard delete - remove from DB)
export async function clearAllNotifications(req: Request, res: Response) {
  const user = (req as any).user;
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
    const socketService = getSocketService();
    socketService.emitToUser(user.publicId, 'notification:cleared_all', {});
    
    // Keep SSE as fallback
    const subs = userSubscribers.get(user.publicId);
    if (subs) {
      const payload = `data: ${JSON.stringify({ event: "cleared_all" })}\n\n`;
      subs.forEach((c) => c.res.write(payload));
    }
    
    res.json({ success: true, message: "All notifications deleted" });
  } catch (error) {
    console.error("Error clearing all notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Enhanced notification creation endpoint
export async function createNotificationEndpoint(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.publicId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { 
      type, 
      message, 
      title, 
      metadata, 
      priority, 
      category, 
      sendEmail = false,
      sendWebSocket = true,
      sendSSE = true 
    } = req.body;

    if (!type || !message) {
      res.status(400).json({ message: "Type and message are required" });
      return;
    }

    const notification = await createNotificationService({
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
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Create notification for multiple users
export async function createBulkNotificationEndpoint(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.publicId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { 
      userIds, 
      type, 
      message, 
      title, 
      metadata, 
      priority, 
      category, 
      sendEmail = false,
      sendWebSocket = true,
      sendSSE = true 
    } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ message: "UserIds array is required" });
      return;
    }

    if (!type || !message) {
      res.status(400).json({ message: "Type and message are required" });
      return;
    }

    const notifications = await createBulkNotification({
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
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Create notification for role
export async function createRoleNotificationEndpoint(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.publicId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { 
      role, 
      type, 
      message, 
      title, 
      metadata, 
      priority, 
      category, 
      sendEmail = false,
      sendWebSocket = true,
      sendSSE = true 
    } = req.body;

    if (!role || !type || !message) {
      res.status(400).json({ message: "Role, type, and message are required" });
      return;
    }

    const notifications = await createRoleNotification({
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
  } catch (error) {
    console.error('Error creating role notifications:', error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get notification types and categories
export async function getNotificationTypes(req: Request, res: Response) {
  res.json({
    types: NOTIFICATION_TYPES,
    priorities: NOTIFICATION_PRIORITY,
    categories: NOTIFICATION_CATEGORIES
  });
}



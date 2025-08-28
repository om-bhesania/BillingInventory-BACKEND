import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { prisma as sharedPrisma } from "../config/client";
import jwt from "jsonwebtoken";

// Prefer shared prisma to avoid multiple client instances
const prisma = sharedPrisma ?? new PrismaClient();

// In-memory subscriber registry for SSE per userPublicId
type SSEClient = { res: Response };
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

export async function listNotifications(req: Request, res: Response) {
  const user = (req as any).user;
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
  const { userId, type, message } = req.body as {
    userId: string;
    type: string;
    message: string;
  };
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
  const subs = userSubscribers.get(userPublicId);
  if (subs) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    subs.forEach((c) => c.res.write(data));
  }
}

// Clear individual notification (soft delete - hide from UI but keep in DB)
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
  } catch (error) {
    console.error("Error clearing notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Clear all notifications for a user (soft delete - hide from UI but keep in DB)
export async function clearAllNotifications(req: Request, res: Response) {
  const user = (req as any).user;
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
  } catch (error) {
    console.error("Error clearing all notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}



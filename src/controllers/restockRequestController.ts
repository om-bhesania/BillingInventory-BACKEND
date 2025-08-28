import { Request, Response } from "express";
import { prisma } from "../config/client";
import { logger } from "../utils/logger";
import { isAdmin, isShopOwner } from "../config/roles";
import { emitUserNotification } from "./NotificationsController";
import { bgRedBright } from "console-log-colors";
import { logActivity } from "../utils/audit";

// Create restock request
export const createRestockRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopId, productId, requestedAmount, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check if user has access to this shop
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Check if user manages this shop by querying directly
    const managedShop = await prisma.shop.findFirst({
      where: { 
        id: shopId,
        managerId: user.publicId 
      },
    });

    const userShopId = managedShop?.id;
    console.log(bgRedBright(user.role), 'user.role');
    // Allow Admin role or Shop_Owner role managing the specific shop
    if (!user.role || (!isAdmin(user.role) && !isShopOwner(user.role))) {
      res.status(403).json({ error: "Access denied: Admin or Shop Owner role required" });
      return;
    }

    // If user is Shop_Owner, they can only create requests for shops they manage
    if (isShopOwner(user.role) && shopId !== userShopId) {
      res.status(403).json({ error: "Shop Owner can only create restock requests for their own shop" });
      return;
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }

    // Create restock request
    const restockRequest = await prisma.restockRequest.create({
      data: {
        shopId,
        productId,
        requestedAmount,
        notes,
        status: "pending",
      },
      include: {
        shop: true,
        product: true,
      },
    });

    // Create notification message
    const notificationMessage = `Restock request: ${requestedAmount} units of ${product.name} requested for ${shop.name}`;
    
    // Notify shop owner/manager
    if (shop.managerId) {
      await prisma.notification.create({
        data: {
          userId: shop.managerId,
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });

      // Emit real-time notification
      emitUserNotification(shop.managerId, {
        event: "created",
        notification: {
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });
    }

    // Notify all Admin users about the restock request
    const adminUsers = await prisma.user.findMany({
      where: {
        role: "Admin"
      },
      select: {
        publicId: true
      }
    });

    for (const adminUser of adminUsers) {
      const adminNotificationMessage = `New restock request from ${shop.name}: ${requestedAmount} units of ${product.name} requested by ${user.name || user.email}`;
      
      await prisma.notification.create({
        data: {
          userId: adminUser.publicId,
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });

      // Emit real-time notification to admin
      emitUserNotification(adminUser.publicId, {
        event: "created",
        notification: {
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });
    }

    // Audit
    await logActivity({
      type: "restock",
      action: "created",
      entity: "RestockRequest",
      entityId: restockRequest.id,
      userId: (req as any).user?.publicId,
      shopId: shopId,
      meta: { requestedAmount, productId }
    });

    res.status(201).json(restockRequest);
  } catch (error) {
    logger.error("Error creating restock request:", error);
    res.status(500).json({ error: "Failed to create restock request" });
  }
};

// Get restock requests by shop ID
export const getRestockRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Check if user manages this shop by querying directly
    const managedShop = await prisma.shop.findFirst({
      where: { 
        id: shopId,
        managerId: user.publicId 
      },
    });

    const userShopId = managedShop?.id;
    
    // Allow Admin role or Shop_Owner role managing the specific shop
    if (!user.role || (!isAdmin(user.role) && !isShopOwner(user.role))) {
      res.status(403).json({ error: "Access denied: Admin or Shop Owner role required" });
      return;
    }

    // If user is Shop_Owner, they can only view requests for shops they manage
    if (isShopOwner(user.role) && shopId !== userShopId) {
      res.status(403).json({ error: "Shop Owner can only view restock requests for their own shop" });
      return;
    }

    const restockRequests = await prisma.restockRequest.findMany({
      where: { shopId },
      include: {
        product: {
          include: {
            category: true,
            flavor: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(restockRequests);
  } catch (error) {
    logger.error("Error fetching restock requests:", error);
    res.status(500).json({ error: "Failed to fetch restock requests" });
  }
};

// Get all restock requests across all shops (Admin only)
export const getAllRestockRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Only Admin role can view all restock requests
    if (!user.role || !isAdmin(user.role)) {
      res.status(403).json({ error: "Access denied: Admin role required" });
      return;
    }

    const restockRequests = await prisma.restockRequest.findMany({
      where: {
        // @ts-ignore
        hidden: false, // Only show non-hidden requests
      },
      include: {
        shop: true,
        product: {
          include: {
            category: true,
            flavor: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(restockRequests);
  } catch (error) {
    logger.error("Error fetching all restock requests:", error);
    res.status(500).json({ error: "Failed to fetch all restock requests" });
  }
};

// Approve restock request
export const approveRestockRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Get restock request
    const restockRequest = await prisma.restockRequest.findUnique({
      where: { id },
      include: {
        shop: true,
        product: true,
      },
    });

    if (!restockRequest) {
      res.status(404).json({ error: "Restock request not found" });
      return;
    }

    // Check if user manages this shop by querying directly
    const managedShop = await prisma.shop.findFirst({
      where: { 
        id: restockRequest.shopId,
        managerId: user.publicId 
      },
    });

    const userShopId = managedShop?.id;
    if (!user.role || (!isAdmin(user.role) && restockRequest.shopId !== userShopId)) {
      res.status(403).json({ error: "Access denied to this shop" });
    }

    if (restockRequest.status !== "pending") {
      res.status(400).json({ error: "Restock request is not pending" });
      return;
    }

    // Approve request and move to in_transit (don't increment shop stock yet)
    const updatedRequest = await prisma.restockRequest.update({
      where: { id },
      data: {
        status: "in_transit",
        updatedAt: new Date(),
      },
    });

    // Decrement factory-level stock now (product.totalStock)
    const product = await prisma.product.findUnique({ where: { id: restockRequest.productId } });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (product.totalStock < restockRequest.requestedAmount) {
      res.status(400).json({ error: `Insufficient factory stock for ${product.name}. Available: ${product.totalStock}, Requested: ${restockRequest.requestedAmount}` });
      return;
    }
    await prisma.product.update({
      where: { id: product.id },
      data: {
        totalStock: {
          decrement: restockRequest.requestedAmount,
        },
        updatedAt: new Date(),
      },
    });

    // Notify the user who created the request
    const notificationMessage = `Restock request approved: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} added to ${restockRequest.shop.name}`;
    
    // Find the user who created the request (this would need to be tracked in the schema)
    // For now, we'll notify shop owner and manager
    if (restockRequest.shop.managerId) {
      await prisma.notification.create({
        data: {
          userId: restockRequest.shop.managerId,
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });
    }

    if (restockRequest.shop.managerId && restockRequest.shop.managerId !== restockRequest.shop.managerId) {
      await prisma.notification.create({
        data: {
          userId: restockRequest.shop.managerId,
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });
    }

    // Notify all Admin users about the approved restock request
    const adminUsers = await prisma.user.findMany({
      where: {
        role: "Admin"
      },
      select: {
        publicId: true
      }
    });

    for (const adminUser of adminUsers) {
      const adminNotificationMessage = `Restock request approved: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} added to ${restockRequest.shop.name} by ${user.name || user.email}`;
      
      await prisma.notification.create({
        data: {
          userId: adminUser.publicId,
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });

      // Emit real-time notification to admin
      emitUserNotification(adminUser.publicId, {
        event: "approved",
        notification: {
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });
    }

    res.status(200).json(updatedRequest);

    // Audit
    await logActivity({
      type: "restock",
      action: "status_changed",
      entity: "RestockRequest",
      entityId: updatedRequest.id,
      userId: (req as any).user?.publicId,
      shopId: restockRequest.shopId,
      meta: { status: updatedRequest.status }
    });
  } catch (error) {
    logger.error("Error approving restock request:", error);
    res.status(500).json({ error: "Failed to approve restock request" });
  }
};

// Reject restock request
export const rejectRestockRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Get restock request
    const restockRequest = await prisma.restockRequest.findUnique({
      where: { id },
      include: {
        shop: true,
        product: true,
      },
    });

    if (!restockRequest) {
      res.status(404).json({ error: "Restock request not found" });
      return;
    }

    // Check if user manages this shop by querying directly
    const managedShop = await prisma.shop.findFirst({
      where: { 
        id: restockRequest.shopId,
        managerId: user.publicId 
      },
    });

    const userShopId = managedShop?.id;
    if (!user.role || (!isAdmin(user.role) && restockRequest.shopId !== userShopId)) {
      res.status(403).json({ error: "Access denied to this shop" });
    }

    if (restockRequest.status !== "pending") {
      res.status(400).json({ error: "Restock request is not pending" });
      return;
    }

    // Update restock request status
    const updatedRequest = await prisma.restockRequest.update({
      where: { id },
      data: {
        status: "rejected",
        notes: notes || restockRequest.notes,
        updatedAt: new Date(),
      },
    });

    // Notify the user who created the request
    const notificationMessage = `Restock request rejected: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name}. Reason: ${notes || "No reason provided"}`;
    
    // Notify shop owner/manager
    if (restockRequest.shop.managerId) {
      await prisma.notification.create({
        data: {
          userId: restockRequest.shop.managerId,
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });

      // Emit real-time notification
      emitUserNotification(restockRequest.shop.managerId, {
        event: "rejected",
        notification: {
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });
    }

    // Notify all Admin users about the rejected restock request
    const adminUsers = await prisma.user.findMany({
      where: {
        role: "Admin"
      },
      select: {
        publicId: true
      }
    });

    for (const adminUser of adminUsers) {
      const adminNotificationMessage = `Restock request rejected: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name} by ${user.name || user.email}. Reason: ${notes || "No reason provided"}`;
      
      await prisma.notification.create({
        data: {
          userId: adminUser.publicId,
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });

      // Emit real-time notification to admin
      emitUserNotification(adminUser.publicId, {
        event: "rejected",
        notification: {
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });
    }

    res.status(200).json(updatedRequest);
  } catch (error) {
    logger.error("Error rejecting restock request:", error);
    res.status(500).json({ error: "Failed to reject restock request" });
  }
};

// Update restock request status
export const updateRestockRequestStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Only Admin role can update restock request status
    if (!user.role || !isAdmin(user.role)) {
      res.status(403).json({ error: "Access denied: Admin role required" });
      return;
    }

    // Get restock request
    const restockRequest = await prisma.restockRequest.findUnique({
      where: { id },
      include: {
        shop: true,
        product: true,
      },
    });

    if (!restockRequest) {
      res.status(404).json({ error: "Restock request not found" });
      return;
    }

    // Validate status transition
    const validStatuses = ["pending", "accepted", "in_transit", "fulfilled", "rejected"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status. Must be one of: pending, accepted, in_transit, fulfilled, rejected" });
      return;
    }

    // Update restock request status
    const updatedRequest = await prisma.restockRequest.update({
      where: { id },
      data: {
        status,
        notes: notes || restockRequest.notes,
        updatedAt: new Date(),
      },
    });

    // If fulfilled via admin/status route, increment shop inventory just like markRestockRequestFulfilled
    if (status === "fulfilled") {
      const currentInventory = await prisma.shopInventory.findFirst({
        where: {
          shopId: restockRequest.shopId,
          productId: restockRequest.productId,
          isActive: true,
        },
      });

      if (currentInventory) {
        await prisma.shopInventory.update({
          where: { id: currentInventory.id },
          data: {
            currentStock: currentInventory.currentStock + restockRequest.requestedAmount,
            lastRestockDate: new Date(),
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.shopInventory.create({
          data: {
            shopId: restockRequest.shopId,
            productId: restockRequest.productId,
            currentStock: restockRequest.requestedAmount,
            lastRestockDate: new Date(),
          },
        });
      }
    }

    // Audit
    await logActivity({
      type: "restock",
      action: "status_changed",
      entity: "RestockRequest",
      entityId: updatedRequest.id,
      userId: (req as any).user?.publicId,
      shopId: restockRequest.shopId,
      meta: { productId: restockRequest.productId, requestedAmount: restockRequest.requestedAmount, status }
    });

    // Create notification message
    const statusMessages = {
      accepted: `Restock request accepted: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name}`,
      in_transit: `Restock request in transit: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name}`,
      fulfilled: `Restock request fulfilled: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name}`,
      rejected: `Restock request rejected: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name}. Reason: ${notes || "No reason provided"}`
    };

    const notificationMessage = statusMessages[status as keyof typeof statusMessages] || `Restock request status updated to ${status}`;

    // Notify shop owner/manager
    if (restockRequest.shop.managerId) {
      await prisma.notification.create({
        data: {
          userId: restockRequest.shop.managerId,
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });

      // Emit real-time notification
      emitUserNotification(restockRequest.shop.managerId, {
        event: "status_updated",
        notification: {
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });
    }

    // Notify all Admin users about the status update
    const adminUsers = await prisma.user.findMany({
      where: {
        role: "Admin"
      },
      select: {
        publicId: true
      }
    });

    for (const adminUser of adminUsers) {
      const adminNotificationMessage = `Restock request status updated: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name} - Status: ${status} by ${user.name || user.email}`;
      
      await prisma.notification.create({
        data: {
          userId: adminUser.publicId,
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });

      // Emit real-time notification to admin
      emitUserNotification(adminUser.publicId, {
        event: "status_updated",
        notification: {
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });
    }

    res.status(200).json(updatedRequest);
  } catch (error) {
    logger.error("Error updating restock request status:", error);
    res.status(500).json({ error: "Failed to update restock request status" });
  }
};

// Mark restock request as fulfilled (called from shop inventory when order is received)
export const markRestockRequestFulfilled = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopId, productId } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Check if user manages this shop
    const managedShop = await prisma.shop.findFirst({
      where: { 
        id: shopId,
        managerId: user.publicId 
      },
    });

    // Allow Admin role or Shop Owner role managing the specific shop
    if (!user.role || (!isAdmin(user.role) && !isShopOwner(user.role))) {
      res.status(403).json({ error: "Access denied: Admin or Shop Owner role required" });
      return;
    }

    // If user is Shop Owner, they can only mark requests for shops they manage
    if (isShopOwner(user.role) && !managedShop) {
      res.status(403).json({ error: "Shop Owner can only mark restock requests as fulfilled for their own shops" });
      return;
    }

    // Find the most recent pending restock request for this product and shop
    const restockRequest = await prisma.restockRequest.findFirst({
      where: {
        shopId,
        productId,
        status: { in: ["pending", "accepted", "in_transit"] }
      },
      orderBy: { createdAt: "desc" },
      include: {
        shop: true,
        product: true,
      },
    });

    if (!restockRequest) {
      res.status(404).json({ error: "No pending restock request found for this product and shop" });
      return;
    }

    // Update restock request status to fulfilled
    const updatedRequest = await prisma.restockRequest.update({
      where: { id: restockRequest.id },
      data: {
        status: "fulfilled",
        updatedAt: new Date(),
      },
    });

    // Increment shop inventory on fulfillment
    const currentInventory = await prisma.shopInventory.findFirst({
      where: {
        shopId,
        productId,
        isActive: true,
      },
    });
    if (currentInventory) {
      await prisma.shopInventory.update({
        where: { id: currentInventory.id },
        data: {
          currentStock: currentInventory.currentStock + restockRequest.requestedAmount,
          lastRestockDate: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.shopInventory.create({
        data: {
          shopId,
          productId,
          currentStock: restockRequest.requestedAmount,
          lastRestockDate: new Date(),
        },
      });
    }

    // Create notification message
    const notificationMessage = `Restock request fulfilled: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} received for ${restockRequest.shop.name}`;

    // Notify shop owner/manager
    if (restockRequest.shop.managerId) {
      await prisma.notification.create({
        data: {
          userId: restockRequest.shop.managerId,
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });

      // Emit real-time notification
      emitUserNotification(restockRequest.shop.managerId, {
        event: "fulfilled",
        notification: {
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });
    }

    // Notify all Admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        role: "Admin"
      },
      select: {
        publicId: true
      }
    });

    for (const adminUser of adminUsers) {
      const adminNotificationMessage = `Restock request fulfilled: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} received for ${restockRequest.shop.name} by ${user.name || user.email}`;
      
      await prisma.notification.create({
        data: {
          userId: adminUser.publicId,
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });

      // Emit real-time notification to admin
      emitUserNotification(adminUser.publicId, {
        event: "fulfilled",
        notification: {
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });
    }

    res.status(200).json(updatedRequest);
  } catch (error) {
    logger.error("Error marking restock request as fulfilled:", error);
    res.status(500).json({ error: "Failed to mark restock request as fulfilled" });
  }
};

// Auto-generate restock request when stock is low
export const autoGenerateRestockRequest = async (shopId: string, productId: string, currentStock: number) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.minStockLevel || currentStock > product.minStockLevel) {
      return null;
    }

    // Check if there's already a pending request
    const existingRequest = await prisma.restockRequest.findFirst({
      where: {
        shopId,
        productId,
        status: "pending",
      },
    });

    if (existingRequest) {
      return existingRequest;
    }

    // Create auto restock request
    const restockRequest = await prisma.restockRequest.create({
      data: {
        shopId,
        productId,
        requestedAmount: product.minStockLevel * 2, // Request 2x min stock level
        notes: "Auto-generated due to low stock",
        status: "pending",
      },
    });

    logger.info(`Auto-generated restock request for product ${productId} in shop ${shopId}`);

    // Trigger notification
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (shop?.managerId) {
      const notificationMessage = `Auto restock request: ${restockRequest.requestedAmount} units of ${product.name} requested for ${shop.name} due to low stock (${currentStock}/${product.minStockLevel})`;
      
      await prisma.notification.create({
        data: {
          userId: shop.managerId,
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });

      // Emit real-time notification
      emitUserNotification(shop.managerId, {
        event: "auto_generated",
        notification: {
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });
    }

    // Notify all Admin users about the auto-generated restock request
    const adminUsers = await prisma.user.findMany({
      where: {
        role: "Admin"
      },
      select: {
        publicId: true
      }
    });

    for (const adminUser of adminUsers) {
      const adminNotificationMessage = `Auto restock request generated: ${restockRequest.requestedAmount} units of ${product.name} requested for ${shop?.name || 'Unknown Shop'} due to low stock (${currentStock}/${product.minStockLevel})`;
      
      await prisma.notification.create({
        data: {
          userId: adminUser.publicId,
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });

      // Emit real-time notification to admin
      emitUserNotification(adminUser.publicId, {
        event: "auto_generated",
        notification: {
          type: "RESTOCK_REQUEST",
          message: adminNotificationMessage,
        },
      });
    }

    return restockRequest;
  } catch (error) {
    logger.error("Error auto-generating restock request:", error);
    return null;
  }
};

// Soft delete restock request (Admin only) - hide from UI but keep in DB
export const softDeleteRestockRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Only Admin role can soft delete restock requests
    if (!user.role || !isAdmin(user.role)) {
      res.status(403).json({ error: "Access denied: Admin role required" });
      return;
    }

    // Get the request with shop and product details before hiding
    const existingRequest = await prisma.restockRequest.findUnique({
      where: { id },
      include: {
        shop: true,
        product: true,
      },
    });

    if (!existingRequest) {
      res.status(404).json({ error: "Restock request not found" });
      return;
    }

    // Soft delete by setting hidden to true
    const deletedRequest = await prisma.restockRequest.update({
      where: { id },
      data: {
        // @ts-ignore
        hidden: true,
      },
      include: {
        shop: true,
        product: true,
      },
    });

    // Create notification for shop owner/manager
    if (existingRequest.shop.managerId) {
      const notificationMessage = `Restock request hidden: ${existingRequest.requestedAmount} units of ${existingRequest.product.name} for ${existingRequest.shop.name}`;
      
      await prisma.notification.create({
        data: {
          userId: existingRequest.shop.managerId,
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });

      // Emit real-time notification
      emitUserNotification(existingRequest.shop.managerId, {
        event: "hidden",
        notification: {
          type: "RESTOCK_REQUEST",
          message: notificationMessage,
        },
      });
    }

    res.status(200).json({ 
      message: "Restock request hidden successfully", 
      request: deletedRequest 
    });
  } catch (error) {
    logger.error("Error hiding restock request:", error);
    res.status(500).json({ error: "Failed to hide restock request" });
  }
};

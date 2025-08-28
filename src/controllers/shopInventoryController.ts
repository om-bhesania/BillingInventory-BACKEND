import { Request, Response } from "express";
import { prisma } from "../config/client";
import { logger } from "../utils/logger";
import { isAdmin, isShopOwner } from "../config/roles";
import { emitUserNotification } from "./NotificationsController";

// Create shop inventory entry
export const createShopInventory = async (req: Request, res: Response): Promise<any> => {
  try {
    const { shopId, productId, currentStock = 0 } = req.body;
    const userId = (req as any).user?.publicId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check if user has access to this shop
    const user = await prisma.user.findUnique({
      where: { publicId: userId },
      include: { 
        Role: true 
      },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Get user's shop IDs from managed shops (temporary until shopIds is available)
    const managedShops = await prisma.shop.findMany({
      where: { managerId: userId },
      select: { id: true }
    });
    const userShopIds = managedShops.map(shop => shop.id);
    
    if (!user.Role || (!isAdmin(user.Role.name) && userShopIds.length === 0)) {
      return res.status(403).json({ error: "User has no assigned shops" });
    }
    // Check if user has access to this shop
    if (!user.Role || (!isAdmin(user.Role.name) && !userShopIds.includes(shopId))) {
      res.status(403).json({ error: "Access denied to this shop" });
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

    // Create shop inventory entry
    const shopInventory = await prisma.shopInventory.create({
      data: {
        shopId,
        productId,
        currentStock,
      },
      include: {
        shop: true,
        product: true,
      },
    });

    // Check if stock is low and trigger notification
    if (product.minStockLevel && currentStock <= product.minStockLevel) {
      const notificationMessage = `Low stock alert: ${product.name} in ${shop.name} has only ${currentStock} units remaining (min: ${product.minStockLevel})`;
      
      // Notify shop manager
      if (shop.managerId) {
        await prisma.notification.create({
          data: {
            userId: shop.managerId,
            type: "LOW_STOCK_ALERT",
            message: notificationMessage,
          },
        });
        
        // Emit real-time notification
        emitUserNotification(shop.managerId, {
          event: "low_stock_alert",
          notification: {
            type: "LOW_STOCK_ALERT",
            message: notificationMessage,
          },
        });
      }
    }

    res.status(201).json(shopInventory);
  } catch (error) {
    logger.error("Error creating shop inventory:", error);
    console.log(error);
    res.status(500).json({ error: "Failed to create shop inventory" });
  }
};

// Get shop inventory by shop ID
export const getShopInventory = async (req: Request, res: Response): Promise<any> => {
  try {
    const { shopId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { publicId: (req as any).user?.publicId },
      include: { 
        Role: true 
      },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Get user's shop IDs from managed shops (temporary until shopIds is available)
    const managedShops = await prisma.shop.findMany({
      where: { managerId: (req as any).user?.publicId },
      select: { id: true }
    });
    const userShopIds = managedShops.map(shop => shop.id);
    
    if (!user.Role || (!isAdmin(user.Role.name) && userShopIds.length === 0)) {
      return res.status(403).json({ error: "User has no assigned shops" });
    }

    // Check if user has access to this shop
    if (!user.Role || (!isAdmin(user.Role.name) && !userShopIds.includes(shopId))) {
      res.status(403).json({ error: "Access denied to this shop" });
      return;
    }

    const inventory = await prisma.shopInventory.findMany({
      where: { 
        shopId,
        isActive: true,
      },
      include: {
        product: {
          include: {
            category: true,
            flavor: true,
          },
        },
      },
      orderBy: { product: { name: "asc" } },
    });

    res.status(200).json(inventory);
  } catch (error) {
    logger.error("Error fetching shop inventory:", error);
    res.status(500).json({ error: "Failed to fetch shop inventory" });
  }
};

// Update shop inventory stock
export const updateShopInventoryStock = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { currentStock } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { publicId: (req as any).user?.publicId },
      include: { 
        Role: true 
      },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Get current inventory entry
    const currentInventory = await prisma.shopInventory.findUnique({
      where: { id },
      include: {
        shop: true,
        product: true,
      },
    });

    if (!currentInventory) {
      res.status(404).json({ error: "Inventory entry not found" });
      return;
    }

    // Get user's shop IDs from managed shops (temporary until shopIds is available)
    const managedShops = await prisma.shop.findMany({
      where: { managerId: (req as any).user?.publicId },
      select: { id: true }
    });
    const userShopIds = managedShops.map(shop => shop.id);
    
    if (!user.Role || (!isAdmin(user.Role.name) && userShopIds.length === 0)) {
      return res.status(403).json({ error: "User has no assigned shops" });
    }

    // Check if user has access to this shop
    if (!user.Role || (!isAdmin(user.Role.name) && !userShopIds.includes(currentInventory.shopId))) {
      res.status(403).json({ error: "Access denied to this shop" });
      return;
    }

    // Update stock
    const updatedInventory = await prisma.shopInventory.update({
      where: { id },
      data: {
        currentStock,
        updatedAt: new Date(),
      },
      include: {
        shop: true,
        product: true,
      },
    });

    // Check if stock is low and trigger notification
    if (updatedInventory.product.minStockLevel && currentStock <= updatedInventory.product.minStockLevel) {
      const notificationMessage = `Low stock alert: ${updatedInventory.product.name} in ${updatedInventory.shop.name} has only ${currentStock} units remaining (min: ${updatedInventory.product.minStockLevel})`;
      
      // Notify shop manager
      if (updatedInventory.shop.managerId) {
        await prisma.notification.create({
          data: {
            userId: updatedInventory.shop.managerId,
            type: "LOW_STOCK_ALERT",
            message: notificationMessage,
          },
        });
        
        emitUserNotification(updatedInventory.shop.managerId, {
          event: "low_stock_alert",
          notification: {
            type: "LOW_STOCK_ALERT",
            message: notificationMessage,
          },
        });
      }
    }

    res.status(200).json(updatedInventory);
  } catch (error) {
    logger.error("Error updating shop inventory stock:", error);
    res.status(500).json({ error: "Failed to update shop inventory stock" });
  }
};

// Remove product from shop (soft delete)
  export const removeProductFromShop = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { publicId: (req as any).user?.publicId },
      include: { 
        Role: true 
      },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const inventory = await prisma.shopInventory.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!inventory) {
      res.status(404).json({ error: "Inventory entry not found" });
      return;
    }

    // Get user's shop IDs from managed shops (temporary until shopIds is available)
    const managedShops = await prisma.shop.findMany({
      where: { managerId: (req as any).user?.publicId },
      select: { id: true }
    });
    const userShopIds = managedShops.map(shop => shop.id);
    
    if (!user.Role || (!isAdmin(user.Role.name) && userShopIds.length === 0)) {
      return res.status(403).json({ error: "User has no assigned shops" });
    }

    // Check if user has access to this shop
    if (!user.Role || (!isAdmin(user.Role.name) && !userShopIds.includes(inventory.shopId))) {
      res.status(403).json({ error: "Access denied to this shop" });
      return;
    }

    // Soft delete by marking as inactive
    const updatedInventory = await prisma.shopInventory.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({ message: "Product removed from shop successfully" });
  } catch (error) {
    logger.error("Error removing product from shop:", error);
    res.status(500).json({ error: "Failed to remove product from shop" });
  }
};

// Initialize shop inventory for new shop
export const initializeShopInventory = async (shopId: string, productIds: string[]) => {
  try {
    const inventoryEntries = await Promise.all(
      productIds.map(productId =>
        prisma.shopInventory.create({
          data: {
            shopId,
            productId,
            currentStock: 0,
          },
        })
      )
    );

    logger.info(`Initialized ${inventoryEntries.length} inventory entries for shop ${shopId}`);
    return inventoryEntries;
  } catch (error) {
    logger.error("Error initializing shop inventory:", error);
    throw error;
  }
};

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { prisma as sharedPrisma } from "../config/client";
import { logger } from "../utils/logger";
import { isAdmin } from "../config/roles";
import { addShopIdToUser, removeShopIdFromUser } from "../utils/shopIdManager";
import { logActivity } from "../utils/audit";

const prisma = sharedPrisma ?? new PrismaClient();

// Create a new shop
export const createShop = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      name,
      description,
      address,
      contactNumber,
      email,
      operatingHours,
      managerId, // Now using publicId
    } = req.body;

    // Validate required fields
    if (!name || !address || !contactNumber || !email || !operatingHours || !managerId) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["name", "address", "contactNumber", "email", "operatingHours", "managerId"],
      });
    }

    // Validate and clean shop name
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({
        error: "Shop name must be at least 2 characters long",
        field: "name"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address",
        field: "email"
      });
    }

    // Validate contact number (basic validation)
    const contactRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (!contactRegex.test(contactNumber)) {
      return res.status(400).json({
        error: "Please provide a valid contact number (at least 10 digits)",
        field: "contactNumber"
      });
    }

    // Check if manager exists - managerId is now required
    const manager = await prisma.user.findUnique({
      where: { publicId: managerId },
    });
    if (!manager) {
      return res.status(404).json({ error: "Manager not found" });
    }

    // Check if a shop with the same name already exists
    const existingShop = await prisma.shop.findFirst({
      where: { name: trimmedName },
    });
    if (existingShop) {
      return res.status(409).json({ 
        error: "Shop with this name already exists",
        existingShop: {
          id: existingShop.id,
          name: existingShop.name,
          address: existingShop.address
        }
      });
    }

    const shop = await prisma.shop.create({
      data: {
        name: trimmedName,
        description,
        address,
        contactNumber,
        email,
        operatingHours,
        managerId, // Using publicId
      },
      include: {
        manager: {
          select: {
            publicId: true,
            name: true,
            email: true,
            contact: true,
          },
        },
      },
    });

    // Automatically add shop ID to user's shopIds array (managerId is now required)
    try {
      await addShopIdToUser(managerId, shop.id);
      logger.info(`Added shop ID ${shop.id} to user ${managerId}'s shopIds array`);
    } catch (error) {
      logger.error(`Failed to add shop ID to user's shopIds array:`, error);
      // Don't fail the shop creation if this fails
    }

    logger.business.shopCreated(shop.name, shop.managerId || '');
    await logActivity({
      type: "shop",
      action: "created",
      entity: "Shop",
      entityId: shop.id,
      userId: (req as any).user?.publicId,
      shopId: shop.id,
      meta: { name }
    });
    return res.status(201).json(shop);
  } catch (error: any) {
    logger.error("Error creating shop:", error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      if (field === 'name') {
        return res.status(409).json({ 
          error: "Shop with this name already exists. Please choose a different name.",
          field: 'name'
        });
      }
      return res.status(409).json({ 
        error: `A shop with this ${field} already exists.`,
        field: field
      });
    }
    
    // Handle other Prisma errors
    if (error.code && error.code.startsWith('P')) {
      return res.status(400).json({ 
        error: "Invalid data provided. Please check your input.",
        details: error.message
      });
    }
    
    console.log(error);
    return res.status(500).json({ error: "Failed to create shop. Please try again later." });
  }
};

// Link a shop to a user as manager
export const linkShopToUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { shopId, userPublicId, role } = req.body as {
      shopId: string;
      userPublicId: string;
      role: "manager";
    };
    if (!shopId || !userPublicId || !role) {
      return res
        .status(400)
        .json({ error: "shopId, userPublicId and role are required" });
    }

    const user = await prisma.user.findUnique({ where: { publicId: userPublicId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    // Get shops that this user was previously managing to remove from their shopIds
    const previousShops = await prisma.shop.findMany({
      where: { managerId: userPublicId },
      select: { id: true }
    });

    // Clear any previous management assignments for this user
    await prisma.shop.updateMany({
      where: { managerId: userPublicId },
      data: { managerId: null },
    });

    // Remove previous shop IDs from user's shopIds array
    for (const shop of previousShops) {
      try {
        await removeShopIdFromUser(userPublicId, shop.id);
      } catch (error) {
        logger.error(`Failed to remove shop ID ${shop.id} from user ${userPublicId}'s shopIds array:`, error);
      }
    }
    
    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: { managerId: userPublicId },
      include: { manager: true },
    });

    // Add new shop ID to user's shopIds array
    try {
      await addShopIdToUser(userPublicId, shopId);
      logger.info(`Added shop ID ${shopId} to user ${userPublicId}'s shopIds array`);
    } catch (error) {
      logger.error(`Failed to add shop ID to user's shopIds array:`, error);
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error linking shop to user:", error);
    return res.status(500).json({ error: "Failed to link shop to user" });
  }
};

// Unlink a shop from a user (manager)
export const unlinkShopFromUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { shopId } = req.body as {
      shopId: string;
    };
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    // Get the current manager before removing
    const currentManagerId = shop.managerId;

    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: { managerId: null },
      include: { manager: true },
    });

    // Remove shop ID from user's shopIds array if there was a manager
    if (currentManagerId) {
      try {
        await removeShopIdFromUser(currentManagerId, shopId);
        logger.info(`Removed shop ID ${shopId} from user ${currentManagerId}'s shopIds array`);
      } catch (error) {
        logger.error(`Failed to remove shop ID from user's shopIds array:`, error);
      }
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error unlinking shop from user:", error);
    return res.status(500).json({ error: "Failed to unlink shop from user" });
  }
};

// Get all shops (admin sees all, employees see only their shop)
export const getAllShops = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userPublicId = (req as any).user?.publicId;
    if (!userPublicId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { publicId: userPublicId },
      include: {
        Role: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    let shops;
    if (user.Role && isAdmin(user.Role.name)) {
      // Admin sees all shops
      shops = await prisma.shop.findMany({
        include: {
          _count: {
            select: {
              inventory: true,
              restockRequests: true,
            },
          },
          manager: {
            select: {
              publicId: true,
              name: true,
              email: true,
              contact: true,
            },
          },
        },
      });
    } else {
      // Shop managers see only their shops (temporary until shopIds is available)
      const managedShops = await prisma.shop.findMany({
        where: { managerId: userPublicId },
        select: { id: true }
      });
      const userShopIds = managedShops.map(shop => shop.id);
      
      if (userShopIds.length === 0) {
        return res.status(200).json([]);
      }

      shops = await prisma.shop.findMany({
        where: { id: { in: userShopIds } },
        include: {
          _count: {
            select: {
              inventory: true,
              restockRequests: true,
            },
          },
          manager: {
            select: {
              publicId: true,
              name: true,
              email: true,
              contact: true,
            },
          },
        },
      });
    }

    return res.status(200).json(shops);
  } catch (error) {
    logger.error("Error fetching shops:", error);
    return res.status(500).json({ error: "Failed to fetch shops" });
  }
};

// Get a single shop by ID (with access control)
export const getShopById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const userPublicId = (req as any).user?.publicId;

    if (!userPublicId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { publicId: userPublicId },
      include: {
        Role: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            inventory: true,
            restockRequests: true,
          },
        },
        manager: {
          select: {
            publicId: true,
            name: true,
            email: true,
            contact: true,
          },
        },
      },
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Check access: admin can see all, employee only their shop (temporary until shopIds is available)
    if (!user.Role || !isAdmin(user.Role.name)) {
      const managedShops = await prisma.shop.findMany({
        where: { managerId: userPublicId },
        select: { id: true }
      });
      const userShopIds = managedShops.map(shop => shop.id);
      
      if (!userShopIds.includes(shop.id)) {
        return res.status(403).json({ error: "Access denied to this shop" });
      }
    }

    return res.status(200).json(shop);
  } catch (error) {
    logger.error("Error fetching shop:", error);
    return res.status(500).json({ error: "Failed to fetch shop" });
  }
};

// Update shop (admin can update any, employee only their own)
export const updateShop = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userPublicId = (req as any).user?.publicId;
    
    if (!userPublicId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { publicId: userPublicId },
      include: {
        Role: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check access: admin can update any, employee only their shop (temporary until shopIds is available)
    if (!user.Role || !isAdmin(user.Role.name)) {
      const managedShops = await prisma.shop.findMany({
        where: { managerId: userPublicId },
        select: { id: true }
      });
      const userShopIds = managedShops.map(shop => shop.id);
      
      if (!userShopIds.includes(id)) {
        return res.status(403).json({ error: "Access denied to this shop" });
      }
    }

    // Extract only valid shop fields from request body
    const {
      name,
      address,
      contactNumber,
      email,
      operatingHours,
      description,
      isActive,
      managerId
    } = req.body;

    // Create update data object with only defined values
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (email !== undefined) updateData.email = email;
    if (operatingHours !== undefined) updateData.operatingHours = operatingHours;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Validate and handle managerId if provided
    if (managerId !== undefined) {
      // Prevent managerId from being set to null - it must always be a valid publicId
      if (!managerId || managerId === null) {
        return res.status(400).json({ 
          error: "managerId cannot be null or empty. It must be a valid user publicId." 
        });
      }
      
      const manager = await prisma.user.findUnique({
        where: { publicId: managerId },
      });
      if (!manager) {
        return res.status(400).json({ error: "Invalid manager ID - user not found" });
      }
      
      // Clear any previous management assignments for this user (due to unique constraint)
      await prisma.shop.updateMany({
        where: { managerId: managerId },
        data: { managerId: null },
      });
      
      updateData.managerId = managerId;
    }

    const shop = await prisma.shop.update({
      where: { id },
      data: updateData,
      include: {
        manager: {
          select: {
            publicId: true,
            name: true,
            email: true,
            contact: true,
          },
        },
      },
    });

    return res.status(200).json(shop);
  } catch (error) {
    logger.error("Error updating shop:", error);
    return res.status(500).json({ error: "Failed to update shop" });
  }
};

// Delete shop (only admin, and only if no manager linked)
export const deleteShop = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userPublicId = (req as any).user?.publicId;

    if (!userPublicId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { publicId: userPublicId },
      include: { Role: true },
    });

    if (!user || !user.Role || !isAdmin(user.Role.name)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if shop has manager
    const shop = await prisma.shop.findUnique({
      where: { id },
      select: { managerId: true },
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    if (shop.managerId) {
      return res.status(400).json({
        error: "Cannot delete shop with linked manager. Unlink them first.",
      });
    }

    await prisma.shop.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Shop deleted successfully" });
  } catch (error) {
    logger.error("Error deleting shop:", error);
    return res.status(500).json({ error: "Failed to delete shop" });
  }
};

// Link shop manager
export const linkShopManager = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { shopId, userPublicId } = req.body;

    if (!shopId || !userPublicId) {
      return res
        .status(400)
        .json({ error: "Shop ID and User Public ID are required" });
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { publicId: userPublicId },
      include: { Role: true },
    });

    if (!currentUser || !currentUser.Role || !isAdmin(currentUser.Role.name)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { publicId: userPublicId },
    });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Update shop with new manager
    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: { managerId: userPublicId },
      include: {
        manager: {
          select: {
            publicId: true,
            name: true,
            email: true,
            contact: true,
          },
        },
      },
    });

    // Add shop ID to user's shopIds array
    try {
      await addShopIdToUser(userPublicId, shopId);
      logger.info(`Added shop ID ${shopId} to user ${userPublicId}'s shopIds array`);
    } catch (error) {
      logger.error(`Failed to add shop ID to user's shopIds array:`, error);
    }

    return res.status(200).json(updatedShop);
  } catch (error) {
    logger.error("Error linking shop manager:", error);
    return res.status(500).json({ error: "Failed to link shop manager" });
  }
};

// Unlink shop manager
export const unlinkShopManager = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { shopId } = req.params;

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { publicId: (req as any).user?.publicId },
      include: { Role: true },
    });

    if (!currentUser || !currentUser.Role || !isAdmin(currentUser.Role.name)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Get the current manager before removing
    const currentManagerId = shop.managerId;
    
    // Remove manager link
    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: { managerId: null },
      include: {
        manager: {
          select: {
            publicId: true,
            name: true,
            email: true,
            contact: true,
          },
        },
      },
    });

    // Remove shop ID from user's shopIds array if there was a manager
    if (currentManagerId) {
      try {
        await removeShopIdFromUser(currentManagerId, shopId);
        logger.info(`Removed shop ID ${shopId} from user ${currentManagerId}'s shopIds array`);
      } catch (error) {
        logger.error(`Failed to remove shop ID from user's shopIds array:`, error);
      }
    }

    return res.status(200).json(updatedShop);
  } catch (error) {
    logger.error("Error unlinking shop manager:", error);
    return res.status(500).json({ error: "Failed to unlink shop manager" });
  }
};

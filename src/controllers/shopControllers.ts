import { Request, Response } from "express";
import { prisma } from "../config/client";
import { Shop, Prisma } from "@prisma/client";
import { AuthenticatedRequest, ShopWithRelations, ApiError } from "../types/models";
import { logger } from "../utils/logger";
import { isAdmin, isShopOwner } from "../config/roles";
import  jwt  from 'jsonwebtoken';

// Create a new shop
export const createShop = async (req: Request, res: Response): Promise<any> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ error: "Authorization token missing" });

    // Decode token and get roleId
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      roleId: string;
      userId: number;
    };
    if (!decoded?.roleId)
      return res.status(401).json({ error: "Invalid token" });

    // Check if user role is Admin
    const userRole = await prisma.role.findUnique({
      where: { id: decoded.roleId },
    });
    if (!userRole || userRole.name !== "Admin") {
      return res.status(403).json({ error: "Only Admins can create shops" });
    }

    const {
      name,
      location,
      address,
      contactNumber,
      email,
      operatingHours,
      description,
      ownerId,
      managerId,
    } = req.body;

    // Verify manager is a Shop Owner
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: parseInt(managerId) },
        include: { Role: true },
      });

      if (!manager)
        return res.status(400).json({ error: "Manager user not found" });

      if (manager.role !== "Shop Owner") {
        return res.status(400).json({ error: "Manager must be a Shop Owner" });
      }
    }

    const shop = await prisma.shop.create({
      data: {
        name,
        location,
        address,
        contactNumber,
        email,
        operatingHours,
        description, 
        managerId: managerId ? parseInt(managerId) : undefined,
      },
      include: { 
        manager: {
          select: { id: true, name: true, email: true, contact: true },
        },
      },
    });

    return res.status(201).json(shop);
  } catch (error) {
    console.error("Error creating shop:", error);
    return res.status(500).json({ error: "Failed to create shop" });
  }
};

// Get all shops (admin sees all, employees see only their shop)
export const getAllShops = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedShop: true,
        managedShop: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    let shops;
    if (user.role && isAdmin(user.role)) {
      // Admin sees all shops
      shops = await prisma.shop.findMany({
        include: {
          _count: {
            select: {
              inventory: true,
              restockRequests: true,
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              contact: true,
            }
          },
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              contact: true,
            }
          }
        },
      });
    } else {
      // Employee sees only their shop
      const userShopId = user.ownedShop?.id || user.managedShop?.id;
      if (!userShopId) {
        return res.status(200).json([]);
      }

      shops = await prisma.shop.findMany({
        where: { id: userShopId },
        include: {
          _count: {
            select: {
              inventory: true,
              restockRequests: true,
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              contact: true,
            }
          },
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              contact: true,
            }
          }
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
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedShop: true,
        managedShop: true
      }
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
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            contact: true,
          }
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            contact: true,
          }
        }
      }
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Check access: admin can see all, employee only their shop
    if (!user.role || !isAdmin(user.role)) {
      const userShopId = user.ownedShop?.id || user.managedShop?.id;
      if (shop.id !== userShopId) {
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
export const updateShop = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedShop: true,
        managedShop: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check access: admin can update any, employee only their shop
    if (!user.role || !isAdmin(user.role)) {
      const userShopId = user.ownedShop?.id || user.managedShop?.id;
      if (id !== userShopId) {
        return res.status(403).json({ error: "Access denied to this shop" });
      }
    }

    // Validate ownerId and managerId if provided
    if (updateData.ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: parseInt(updateData.ownerId) }
      });
      if (!owner || owner.role !== "employee") {
        return res.status(400).json({ error: "Invalid owner ID" });
      }
    }

    if (updateData.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: parseInt(updateData.managerId) }
      });
      if (!manager || manager.role !== "employee") {
        return res.status(400).json({ error: "Invalid manager ID" });
      }
    }

    const shop = await prisma.shop.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            contact: true,
          }
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            contact: true,
          }
        }
      }
    });

    return res.status(200).json(shop);
  } catch (error) {
    logger.error("Error updating shop:", error);
    return res.status(500).json({ error: "Failed to update shop" });
  }
};

// Delete shop (only admin, and only if no owner/manager linked)
export const deleteShop = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || !user.role || !isAdmin(user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if shop has owner or manager
    const shop = await prisma.shop.findUnique({
      where: { id },
      select: { ownerId: true, managerId: true }
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    if (shop.ownerId || shop.managerId) {
      return res.status(400).json({ 
        error: "Cannot delete shop with linked owner or manager. Unlink them first." 
      });
    }

    await prisma.shop.delete({
      where: { id }
    });

    return res.status(200).json({ message: "Shop deleted successfully" });
  } catch (error) {
    logger.error("Error deleting shop:", error);
    return res.status(500).json({ error: "Failed to delete shop" });
  }
};

// Link/unlink shop owner
export const linkShopOwner = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { shopId, userId } = req.body;

    if (!shopId || !userId) {
      return res.status(400).json({ error: "Shop ID and User ID are required" });
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: (req as any).user?.id },
      select: { role: true }
    });

    if (!currentUser || !currentUser.role || !isAdmin(currentUser.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if user exists and is employee
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user || user.role !== "employee") {
      return res.status(400).json({ error: "User must be an employee" });
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId }
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Update shop with new owner
    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: { ownerId: parseInt(userId) },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            contact: true,
          }
        }
      }
    });

    return res.status(200).json(updatedShop);
  } catch (error) {
    logger.error("Error linking shop owner:", error);
    return res.status(500).json({ error: "Failed to link shop owner" });
  }
};

// Unlink shop owner
export const unlinkShopOwner = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { shopId } = req.params;

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: (req as any).user?.id },
      select: { role: true }
    });

    if (!currentUser || !currentUser.role || !isAdmin(currentUser.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId }
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Remove owner link
    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: { ownerId: null },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            contact: true,
          }
        }
      }
    });

    return res.status(200).json(updatedShop);
  } catch (error) {
    logger.error("Error unlinking shop owner:", error);
    return res.status(500).json({ error: "Failed to unlink shop owner" });
  }
};

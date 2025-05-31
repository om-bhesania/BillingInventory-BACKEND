import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { fetchUserId } from "../middlewares/AuthMiddleware";

const prisma = new PrismaClient();

// Create a new shop
export const createShop = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      name,
      location,
      address,
      contactNumber,
      email,
      operatingHours,
      isActive,
      openingDate,
      managerName,
      maxCapacity,
      description,
      logoUrl,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: "Shop name is required" });
    }

    if (!managerName) {
      return res.status(400).json({ error: "Manager name is required" });
    }

    const existingShop = await prisma.shop.findUnique({
      where: { id: name },
    });

    if (existingShop) {
      return res
        .status(409)
        .json({ error: "Shop with same name already exists" });
    }

    const userId = fetchUserId();
    const shop = await prisma.shop.create({
      data: {
        name,
        createdBy: userId,
        location,
        address,
        contactNumber,
        email,
        operatingHours,
        isActive: isActive !== undefined ? isActive : true,
        openingDate: openingDate ? new Date(openingDate) : null,
        managerName,
        maxCapacity: maxCapacity ? parseInt(maxCapacity.toString()) : null,
        description,
        logoUrl,
      },
    });

    // Find the user by managerName
    const user = await prisma.user.findUnique({
      where: {
        id: managerName,
      },
    });

    if (!user) {
      await prisma.shop.delete({
        where: {
          id: shop.id,
        },
      });
      return res.status(404).json({ error: "Manager not found" });
    }

    // Update the user's shopId with the newly created shop's ID
    await prisma.user.update({
      where: {
        id: managerName,
      },
      data: {
        shopId: shop.id,
        shopName: shop.name,
      },
    });

    return res.status(201).json(shop);
  } catch (error) {
    console.error("Error creating shop:", error);
    return res.status(500).json({ error: "Failed to create shop" });
  }
};

// Get all shops
export const getAllShops = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const shops = await prisma.shop.findMany({
      include: {
        _count: {
          select: {
            inventory: true,
            restockRequests: true,
          },
        },
      },
    });

    return res.status(200).json(shops);
  } catch (error) {
    console.error("Error fetching shops:", error);
    return res.status(500).json({ error: "Failed to fetch shops" });
  }
};

// Get a single shop by ID
export const getShopById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            product: {
              include: {
                flavor: true,
                category: true,
              },
            },
          },
        },
        restockRequests: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    return res.status(200).json(shop);
  } catch (error) {
    console.error("Error fetching shop:", error);
    return res.status(500).json({ error: "Failed to fetch shop" });
  }
};

// Update a shop
export const updateShop = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const {
      name,
      location,
      address,
      contactNumber,
      email,
      operatingHours,
      isActive,
      openingDate,
      managerName,
      maxCapacity,
      description,
      logoUrl,
    } = req.body;

    // Check if shop exists
    const existingShop = await prisma.shop.findUnique({
      where: { id },
    });

    if (!existingShop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const updatedShop = await prisma.shop.update({
      where: { id },
      data: {
        name,
        location,
        address,
        contactNumber,
        email,
        operatingHours,
        isActive: isActive !== undefined ? isActive : undefined,
        openingDate: openingDate ? new Date(openingDate) : undefined,
        managerName,
        maxCapacity: maxCapacity ? parseInt(maxCapacity.toString()) : undefined,
        description,
        logoUrl,
      },
    });

    return res.status(200).json(updatedShop);
  } catch (error) {
    console.error("Error updating shop:", error);
    return res.status(500).json({ error: "Failed to update shop" });
  }
};

// Delete a shop
export const deleteShop = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // Check if shop exists
    const existingShop = await prisma.shop.findUnique({
      where: { id },
    });

    if (!existingShop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Delete the shop's inventory first
    await prisma.shopInventory.deleteMany({
      where: { shopId: id },
    });

    // Delete the shop's restock requests
    await prisma.restockRequest.deleteMany({
      where: { shopId: id },
    });

    // Delete the shop
    await prisma.shop.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Shop deleted successfully" });
  } catch (error) {
    console.error("Error deleting shop:", error);
    return res.status(500).json({ error: "Failed to delete shop" });
  }
};

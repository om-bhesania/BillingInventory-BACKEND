import { Request, Response } from "express";
import { prisma } from "../config/client";
import { emitUserNotification } from "./NotificationsController";
import { logActivity } from "../utils/audit";

export const createFlavor = async (req: Request, res: Response) => {
  try {
    const { name, imageUrl } = req.body;

    const flavor = await prisma.flavor.create({
      data: {
        name: name,
        imageUrl: imageUrl,
      },
    });
    try {
        const userId = (req as any).user?.publicId as string | undefined;
      if (userId) {
        const created = await prisma.notification.create({
          data: { userId, type: "FLAVOR_CREATED", message: `Created flavor ${flavor.name}` },
        });
        await emitUserNotification(userId.toString(), { event: "created", notification: created });
      }
    } catch {}
    res.status(201).json(flavor);
    await logActivity({
      type: "flavor",
      action: "created",
      entity: "Flavor",
      entityId: flavor.id,
      userId: (req as any).user?.publicId,
      meta: { name: flavor.name }
    });
  } catch (error) {
    console.error("Error creating flavor:", error);
    if ((error as any).code === "P2002") {
      return res
        .status(400)
        .json({ error: "A flavor with this name already exists" });
    }
    res.status(500).json({ error: "Failed to create flavor" });
  }
};

export const getFlavors = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    } else {
      where.isActive = true; // Default to active flavors
    }

    const flavors = await prisma.flavor.findMany({
      where,
      orderBy: {
        name: "asc",
      },
    });

    res.json(flavors);
  } catch (error) {
    console.error("Error fetching flavors:", error);
    res.status(500).json({ error: "Failed to fetch flavors" });
  }
};

export const getFlavorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const flavor = await prisma.flavor.findUnique({
      where: { id },
      include: {
        products: {
          where: {
            isActive: true,
          },
          include: {
            category: true,
          },
        },
      },
    });

    if (!flavor) {
      return res.status(404).json({ error: "Flavor not found" });
    }

    res.json(flavor);
  } catch (error) {
    console.error("Error fetching flavor:", error);
    res.status(500).json({ error: "Failed to fetch flavor" });
  }
};

export const updateFlavor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, imageUrl, isActive } = req.body;

    // Check if flavor exists
    const existingFlavor = await prisma.flavor.findUnique({
      where: { id },
    });

    if (!existingFlavor) {
      return res.status(404).json({ error: "Flavor not found" });
    }

    const flavor = await prisma.flavor.update({
      where: { id },
      data: {
        name,
        imageUrl,
        isActive,
      },
    });

    res.json(flavor);
  } catch (error) {
    console.error("Error updating flavor:", error);
    if ((error as any).code === "P2002") {
      return res
        .status(400)
        .json({ error: "A flavor with this name already exists" });
    }
    res.status(500).json({ error: "Failed to update flavor" });
  }
};

export const deleteFlavor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete - mark as inactive
    await prisma.flavor.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    res.json({ message: "Flavor deactivated successfully" });
  } catch (error) {
    console.error("Error deactivating flavor:", error);
    res.status(500).json({ error: "Failed to delete flavor" });
  }
};

export const hardDeleteFlavor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if there are any related products
    const relatedProducts = await prisma.product.findMany({
      where: { flavorId: id },
    });

    if (relatedProducts.length > 0) {
      return res.status(400).json({
        error: "Cannot delete flavor with existing products",
        count: relatedProducts.length,
      });
    }

    // Hard delete - remove from database
    await prisma.flavor.delete({
      where: { id },
    });

    res.json({ message: "Flavor permanently deleted" });
  } catch (error) {
    console.error("Error deleting flavor:", error);
    res.status(500).json({ error: "Failed to delete flavor" });
  }
};

export const getFlavorProductStats = async (req: Request, res: Response) => {
  try {
    const flavorStats = await prisma.flavor.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedStats = flavorStats.map((flavor) => ({
      id: flavor.id,
      name: flavor.name,
      productCount: flavor._count.products,
    }));

    res.json(formattedStats);
  } catch (error) {
    console.error("Error fetching flavor stats:", error);
    res.status(500).json({ error: "Failed to fetch flavor statistics" });
  }
};

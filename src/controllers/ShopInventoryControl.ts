import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

// Create a new shop inventory item
export const createShopInventory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      shopId,
      productId,
      currentStock,
      lastRestockDate,
    } = req.body;

    // Validate required fields
    if (!shopId) {
      return res.status(400).json({ error: "Shop ID is required" });
    }

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    if (currentStock === undefined || currentStock === null) {
      return res.status(400).json({ error: "Current stock is required" });
    }

    if (currentStock < 0) {
      return res
        .status(400)
        .json({ error: "Current stock cannot be negative" });
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if inventory item already exists for this shop and product
    const existingInventory = await prisma.shopInventory.findUnique({
      where: {
        shopId_productId: {
          shopId,
          productId,
        },
      },
    });

    if (existingInventory) {
      return res.status(409).json({
        error:
          "Inventory item already exists for this shop and product combination",
      });
    }

    const shopInventory = await prisma.shopInventory.create({
      data: {
        shopId,
        productId,
        currentStock: parseInt(currentStock.toString()),
        lastRestockDate: lastRestockDate ? new Date(lastRestockDate) : null,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        product: {
          include: {
            flavor: true,
            category: true,
          },
        },
      },
    });

    return res.status(201).json(shopInventory);
  } catch (error) {
    console.error("Error creating shop inventory:", error);
    return res.status(500).json({ error: "Failed to create shop inventory" });
  }
};

// Get all shop inventory items
export const getAllShopInventory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { shopId, productId, lowStock } = req.query;

    // Build filter conditions
    const where: any = {};

    if (shopId) {
      where.shopId = shopId as string;
    }

    if (productId) {
      where.productId = productId as string;
    }

    if (lowStock) {
      const threshold = parseInt(lowStock as string);
      if (!isNaN(threshold)) {
        where.currentStock = {
          lte: threshold,
        };
      }
    }

    const shopInventory = await prisma.shopInventory.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        product: {
          include: {
            flavor: true,
            category: true,
          },
        },
      },
      orderBy: [{ shop: { name: "asc" } }, { product: { name: "asc" } }],
    });

    return res.status(200).json(shopInventory);
  } catch (error) {
    console.error("Error fetching shop inventory:", error);
    return res.status(500).json({ error: "Failed to fetch shop inventory" });
  }
};

// Get inventory for a specific shop
export const getShopInventoryByShopId = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { shopId } = req.params;
    const { lowStock, category, flavor } = req.query;

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Build filter conditions
    const where: any = {
      shopId,
    };

    if (lowStock) {
      const threshold = parseInt(lowStock as string);
      if (!isNaN(threshold)) {
        where.currentStock = {
          lte: threshold,
        };
      }
    }

    // Product filters
    const productFilter: any = {};
    if (category) {
      productFilter.categoryId = category as string;
    }
    if (flavor) {
      productFilter.flavorId = flavor as string;
    }

    if (Object.keys(productFilter).length > 0) {
      where.product = productFilter;
    }

    const shopInventory = await prisma.shopInventory.findMany({
      where,
      include: {
        product: {
          include: {
            flavor: true,
            category: true,
          },
        },
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    });

    return res.status(200).json({
      shop: {
        id: shop.id,
        name: shop.name,
        location: shop.location,
      },
      inventory: shopInventory,
      totalItems: shopInventory.length,
      lowStockItems: shopInventory.filter((item) =>
        lowStock
          ? item.currentStock <= parseInt(lowStock as string)
          : item.currentStock <= 10
      ).length,
    });
  } catch (error) {
    console.error("Error fetching shop inventory:", error);
    return res.status(500).json({ error: "Failed to fetch shop inventory" });
  }
};

// Get a single inventory item by ID
export const getShopInventoryById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    const shopInventory = await prisma.shopInventory.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            location: true,
            address: true,
            contactNumber: true,
            managerName: true,
          },
        },
        product: {
          include: {
            flavor: true,
            category: true,
          },
        },
      },
    });

    if (!shopInventory) {
      return res.status(404).json({ error: "Shop inventory item not found" });
    }

    return res.status(200).json(shopInventory);
  } catch (error) {
    console.error("Error fetching shop inventory item:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch shop inventory item" });
  }
};

// Update shop inventory item
export const updateShopInventory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { currentStock, lastRestockDate } = req.body;

    // Check if inventory item exists
    const existingInventory = await prisma.shopInventory.findUnique({
      where: { id },
    });

    if (!existingInventory) {
      return res.status(404).json({ error: "Shop inventory item not found" });
    }

    // Validate current stock if provided
    if (currentStock !== undefined && currentStock < 0) {
      return res
        .status(400)
        .json({ error: "Current stock cannot be negative" });
    }

    const updatedInventory = await prisma.shopInventory.update({
      where: { id },
      data: {
        currentStock:
          currentStock !== undefined
            ? parseInt(currentStock.toString())
            : undefined,
        lastRestockDate: lastRestockDate
          ? new Date(lastRestockDate)
          : undefined,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        product: {
          include: {
            flavor: true,
            category: true,
          },
        },
      },
    });

    return res.status(200).json(updatedInventory);
  } catch (error) {
    console.error("Error updating shop inventory:", error);
    return res.status(500).json({ error: "Failed to update shop inventory" });
  }
};

// Update stock quantity (for stock adjustments)
export const updateStock = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { quantity, operation = "set" } = req.body; // operation: 'set', 'add', 'subtract'

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ error: "Quantity is required" });
    }

    // Check if inventory item exists
    const existingInventory = await prisma.shopInventory.findUnique({
      where: { id },
    });

    if (!existingInventory) {
      return res.status(404).json({ error: "Shop inventory item not found" });
    }

    let newStock: number;
    const qty = parseInt(quantity.toString());

    switch (operation) {
      case "add":
        newStock = existingInventory.currentStock + qty;
        break;
      case "subtract":
        newStock = existingInventory.currentStock - qty;
        break;
      case "set":
      default:
        newStock = qty;
        break;
    }

    if (newStock < 0) {
      return res.status(400).json({ error: "Stock cannot be negative" });
    }

    const updatedInventory = await prisma.shopInventory.update({
      where: { id },
      data: {
        currentStock: newStock,
        lastRestockDate: operation === "add" ? new Date() : undefined,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        product: {
          include: {
            flavor: true,
            category: true,
          },
        },
      },
    });

    return res.status(200).json({
      ...updatedInventory,
      stockChange: {
        operation,
        quantity: qty,
        previousStock: existingInventory.currentStock,
        newStock,
      },
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    return res.status(500).json({ error: "Failed to update stock" });
  }
};

// Bulk update inventory for a shop
export const bulkUpdateShopInventory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { shopId } = req.params;
    const { items } = req.body; // Array of { productId, currentStock, lastRestockDate? }

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Items array is required and cannot be empty" });
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const updatePromises = items.map(async (item: any) => {
      const { productId, currentStock, lastRestockDate } = item;

      if (!productId || currentStock === undefined) {
        throw new Error(
          "ProductId and currentStock are required for each item"
        );
      }

      if (currentStock < 0) {
        throw new Error(
          `Current stock cannot be negative for product ${productId}`
        );
      }

      return prisma.shopInventory.upsert({
        where: {
          shopId_productId: {
            shopId,
            productId,
          },
        },
        update: {
          currentStock: parseInt(currentStock.toString()),
          lastRestockDate: lastRestockDate
            ? new Date(lastRestockDate)
            : undefined,
        },
        create: {
          shopId,
          productId,
          currentStock: parseInt(currentStock.toString()),
          lastRestockDate: lastRestockDate ? new Date(lastRestockDate) : null,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    const results = await Promise.all(updatePromises);

    return res.status(200).json({
      message: "Bulk inventory update completed successfully",
      updatedItems: results.length,
      items: results,
    });
  } catch (error) {
    console.error("Error bulk updating shop inventory:", error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to bulk update shop inventory",
    });
  }
};

// Delete shop inventory item
export const deleteShopInventory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    // Check if inventory item exists
    const existingInventory = await prisma.shopInventory.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            name: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!existingInventory) {
      return res.status(404).json({ error: "Shop inventory item not found" });
    }

    await prisma.shopInventory.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Shop inventory item deleted successfully",
      deletedItem: {
        shopName: existingInventory.shop.name,
        productName: existingInventory.product.name,
        previousStock: existingInventory.currentStock,
      },
    });
  } catch (error) {
    console.error("Error deleting shop inventory:", error);
    return res.status(500).json({ error: "Failed to delete shop inventory" });
  }
};

// Get low stock items across all shops
export const getLowStockItems = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { threshold = 10, shopId } = req.query;
    const stockThreshold = parseInt(threshold as string);

    const where: any = {
      currentStock: {
        lte: stockThreshold,
      },
    };

    if (shopId) {
      where.shopId = shopId as string;
    }

    const lowStockItems = await prisma.shopInventory.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            location: true,
            managerName: true,
            contactNumber: true,
          },
        },
        product: {
          include: {
            flavor: true,
            category: true,
          },
        },
      },
      orderBy: [{ currentStock: "asc" }, { shop: { name: "asc" } }],
    });

    return res.status(200).json({
      threshold: stockThreshold,
      totalLowStockItems: lowStockItems.length,
      items: lowStockItems,
    });
  } catch (error) {
    console.error("Error fetching low stock items:", error);
    return res.status(500).json({ error: "Failed to fetch low stock items" });
  }
};

// Get inventory statistics
export const getInventoryStats = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { shopId } = req.query;

    const where: any = {};
    if (shopId) {
      where.shopId = shopId as string;
    }

    const [
      totalItems,
      totalStock,
      lowStockItems,
      outOfStockItems,
      recentlyRestocked,
    ] = await Promise.all([
      prisma.shopInventory.count({ where }),
      prisma.shopInventory.aggregate({
        where,
        _sum: {
          currentStock: true,
        },
      }),
      prisma.shopInventory.count({
        where: {
          ...where,
          currentStock: {
            lte: 10,
            gt: 0,
          },
        },
      }),
      prisma.shopInventory.count({
        where: {
          ...where,
          currentStock: 0,
        },
      }),
      prisma.shopInventory.count({
        where: {
          ...where,
          lastRestockDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    return res.status(200).json({
      totalItems,
      totalStock: totalStock._sum.currentStock || 0,
      lowStockItems,
      outOfStockItems,
      recentlyRestocked,
      healthyStockItems: totalItems - lowStockItems - outOfStockItems,
    });
  } catch (error) {
    console.error("Error fetching inventory statistics:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch inventory statistics" });
  }
};

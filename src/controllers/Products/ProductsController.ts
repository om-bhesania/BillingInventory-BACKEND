import { Request, Response } from "express";
import { prisma } from "../../config/client";
import { logger } from "../../utils/logger";
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      sku,
      name,
      description,
      categoryId,
      packagingType,
      quantityInLiters,
      unitSize,
      unitMeasurement,
      unitPrice,
      totalStock,
      minStockLevel,
      barcode,
      imageUrl,
      flavorId,
    } = req.body;

    // Validate that category and flavor exist
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const flavor = await prisma.flavor.findUnique({
      where: { id: flavorId },
    });

    if (!flavor) {
      return res.status(400).json({ error: "Invalid flavor ID" });
    }

    // Check if SKU is unique
    const existingSku = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingSku) {
      return res.status(400).json({ error: "SKU already exists" });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        categoryId,
        packagingType,
        quantityInLiters,
        unitSize,
        unitMeasurement,
        unitPrice,
        totalStock,
        minStockLevel,
        barcode,
        imageUrl,
        flavorId,
      },
      include: {
        category: true,
        flavor: true,
      },
    });

    logger.controller.create("Product", { name: product.name, sku: product.sku });
    res.status(201).json(product);
  } catch (error) {
    logger.error("Error creating product:", error);
    if ((error as any).code === "P2002") {
      return res
        .status(400)
        .json({ error: "A product with this SKU already exists" });
    }
    res.status(500).json({ error: "Failed to create product" });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    // Get query parameters for filtering
    const { categoryId, flavorId, isActive } = req.query;

    // Build where clause based on query parameters
    const where: any = {};

    if (categoryId) where.categoryId = categoryId as string;
    if (flavorId) where.flavorId = flavorId as string;
    if (isActive !== undefined) where.isActive = isActive === "true";
    else where.isActive = true; // Default to active products only

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        flavor: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json(products);
  } catch (error) {
    logger.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        flavor: true,
        restockRequests: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    logger.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

export const getProductBySku = async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;

    const product = await prisma.product.findUnique({
      where: { sku },
      include: {
        category: true,
        flavor: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    logger.error("Error fetching product by SKU:", error);
    res.status(500).json({ error: "Failed to fetch product by SKU" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      sku,
      name,
      description,
      categoryId,
      packagingType,
      quantityInLiters,
      unitSize,
      unitMeasurement,
      unitPrice,
      totalStock,
      minStockLevel,
      barcode,
      imageUrl,
      flavorId,
      isActive,
    } = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // If categoryId is provided, validate it exists
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(400).json({ error: "Invalid category ID" });
      }
    }

    // If flavorId is provided, validate it exists
    if (flavorId) {
      const flavor = await prisma.flavor.findUnique({
        where: { id: flavorId },
      });

      if (!flavor) {
        return res.status(400).json({ error: "Invalid flavor ID" });
      }
    }

    // If SKU is changed, check it's not already in use
    if (sku && sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku },
      });

      if (existingSku && existingSku.id !== id) {
        return res.status(400).json({ error: "SKU already exists" });
      }
    }
    

    const product = await prisma.product.update({
      where: { id },
      data: { 
        name,
        description,
        categoryId,
        packagingType,
        quantityInLiters,
        unitSize,
        unitMeasurement,
        unitPrice,
        totalStock,
        minStockLevel,
        barcode,
        imageUrl,
        flavorId,
        isActive,
      },
      include: {
        category: true,
        flavor: true,
      },
    });

    logger.controller.update("Product", product.id, { name: product.name });
    res.json(product);
  } catch (error) {
    logger.error("Error updating product:", error);
    if ((error as any).code === "P2002") {
      return res
        .status(400)
        .json({ error: "A product with this SKU already exists" });
    }
    res.status(500).json({ error: "Failed to update product" });
  }
};

export const updateProductStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { totalStock } = req.body;

    if (typeof totalStock !== "number" || totalStock < 0) {
      return res.status(400).json({ error: "Invalid stock value" });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { totalStock },
    });

    res.json(product);
  } catch (error) {
    logger.error("Error updating product stock:", error);
    res.status(500).json({ error: "Failed to update product stock" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete - mark as inactive
    await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    res.json({ message: "Product deactivated successfully" });
  } catch (error) {
    logger.error("Error deactivating product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

export const hardDeleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if there are any related restock requests
    const relatedRequests = await prisma.restockRequest.findMany({
      where: { productId: id },
    });

    if (relatedRequests.length > 0) {
      return res.status(400).json({
        error: "Cannot delete product with existing restock requests",
        count: relatedRequests.length,
      });
    }

    // Hard delete - remove from database
    const product = await prisma.product.findUnique({ where: { id } });
    await prisma.product.delete({
      where: { id },
    });

    const productCount = await prisma.product.count();

    res.json({
      message: `${product?.name} has been successfully deleted`,
      count: productCount,
    });
  } catch (error) {
    logger.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

export const getProductsByFlavor = async (req: Request, res: Response) => {
  try {
    const { flavorId } = req.params;

    // First check if flavor exists
    const flavor = await prisma.flavor.findUnique({
      where: { id: flavorId },
    });

    if (!flavor) {
      return res.status(404).json({ error: "Flavor not found" });
    }

    const products = await prisma.product.findMany({
      where: {
        flavorId,
        isActive: true,
      },
      include: {
        category: true,
        flavor: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      flavor,
      products,
    });
  } catch (error) {
    logger.error("Error fetching products by flavor:", error);
    res.status(500).json({ error: "Failed to fetch products by flavor" });
  }
};

export const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        minStockLevel: {
          not: null,
        },
        totalStock: {
          lte: prisma.product.fields.minStockLevel,
        },
      },
      include: {
        category: true,
        flavor: true,
      },
      orderBy: {
        totalStock: "asc",
      },
    });

    res.json(lowStockProducts);
  } catch (error) {
    logger.error("Error fetching low stock products:", error);
    res.status(500).json({ error: "Failed to fetch low stock products" });
  }
};

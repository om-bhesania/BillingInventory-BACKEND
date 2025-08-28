"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLowStockProducts = exports.getProductsByFlavor = exports.hardDeleteProduct = exports.deleteProduct = exports.updateProductStock = exports.updateProduct = exports.getProductBySku = exports.getProductById = exports.getProducts = exports.createProduct = void 0;
const client_1 = require("../../config/client");
const logger_1 = require("../../utils/logger");
const NotificationsController_1 = require("../NotificationsController");
const audit_1 = require("../../utils/audit");
const createProduct = async (req, res) => {
    try {
        const { sku, name, description, categoryId, packagingTypeId, quantityInLiters, unitSize, unitMeasurement, unitPrice, totalStock, minStockLevel, barcode, imageUrl, flavorId, } = req.body;
        // Validate that category and flavor exist
        const category = await client_1.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            return res.status(400).json({ error: "Invalid category ID" });
        }
        const flavor = await client_1.prisma.flavor.findUnique({
            where: { id: flavorId },
        });
        // If packagingTypeId provided, validate exists
        if (packagingTypeId) {
            const pkg = await client_1.prisma.packagingType.findUnique({ where: { id: packagingTypeId } });
            if (!pkg) {
                return res.status(400).json({ error: "Invalid packaging type ID" });
            }
        }
        if (!flavor) {
            return res.status(400).json({ error: "Invalid flavor ID" });
        }
        // Check if SKU is unique
        const existingSku = await client_1.prisma.product.findUnique({
            where: { sku },
        });
        if (existingSku) {
            return res.status(400).json({ error: "SKU already exists" });
        }
        const product = await client_1.prisma.product.create({
            data: {
                sku,
                name,
                description,
                categoryId,
                packagingTypeId,
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
        logger_1.logger.controller.create("Product", { name: product.name, sku: product.sku });
        await (0, audit_1.logActivity)({
            type: "product",
            action: "created",
            entity: "Product",
            entityId: product.id,
            userId: req.user?.publicId,
            meta: { name: product.name, sku: product.sku }
        });
        try {
            const userId = req.user?.publicId;
            if (userId) {
                const created = await client_1.prisma.notification.create({
                    data: {
                        userId,
                        type: "PRODUCT_CREATED",
                        message: `Created product ${product.name}`,
                    },
                });
                await (0, NotificationsController_1.emitUserNotification)(userId.toString(), { event: "created", notification: created });
                // Low stock notification on create
                if (product.minStockLevel != null && product.totalStock <= product.minStockLevel) {
                    const low = await client_1.prisma.notification.create({
                        data: {
                            userId,
                            type: "LOW_STOCK",
                            message: `${product.name} is at or below minimum stock`,
                        },
                    });
                    await (0, NotificationsController_1.emitUserNotification)(userId.toString(), { event: "created", notification: low });
                }
            }
        }
        catch { }
        res.status(201).json(product);
    }
    catch (error) {
        logger_1.logger.error("Error creating product:", error);
        if (error.code === "P2002") {
            return res
                .status(400)
                .json({ error: "A product with this SKU already exists" });
        }
        res.status(500).json({ error: "Failed to create product" });
    }
};
exports.createProduct = createProduct;
const getProducts = async (req, res) => {
    try {
        // Get query parameters for filtering
        const { categoryId, flavorId, isActive } = req.query;
        // Build where clause based on query parameters
        const where = {};
        if (categoryId)
            where.categoryId = categoryId;
        if (flavorId)
            where.flavorId = flavorId;
        if (isActive !== undefined)
            where.isActive = isActive === "true";
        else
            where.isActive = true; // Default to active products only
        const products = await client_1.prisma.product.findMany({
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
    }
    catch (error) {
        logger_1.logger.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await client_1.prisma.product.findUnique({
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
    }
    catch (error) {
        logger_1.logger.error("Error fetching product:", error);
        res.status(500).json({ error: "Failed to fetch product" });
    }
};
exports.getProductById = getProductById;
const getProductBySku = async (req, res) => {
    try {
        const { sku } = req.params;
        const product = await client_1.prisma.product.findUnique({
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
    }
    catch (error) {
        logger_1.logger.error("Error fetching product by SKU:", error);
        res.status(500).json({ error: "Failed to fetch product by SKU" });
    }
};
exports.getProductBySku = getProductBySku;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { sku, name, description, categoryId, packagingTypeId, quantityInLiters, unitSize, unitMeasurement, unitPrice, totalStock, minStockLevel, barcode, imageUrl, flavorId, isActive, } = req.body;
        // Check if product exists
        const existingProduct = await client_1.prisma.product.findUnique({
            where: { id },
        });
        if (!existingProduct) {
            return res.status(404).json({ error: "Product not found" });
        }
        // If categoryId is provided, validate it exists
        if (categoryId) {
            const category = await client_1.prisma.category.findUnique({
                where: { id: categoryId },
            });
            if (!category) {
                return res.status(400).json({ error: "Invalid category ID" });
            }
        }
        // If flavorId is provided, validate it exists
        if (flavorId) {
            const flavor = await client_1.prisma.flavor.findUnique({
                where: { id: flavorId },
            });
            // If packagingTypeId is provided, validate exists
            if (req.body.packagingTypeId) {
                const pkg = await client_1.prisma.packagingType.findUnique({ where: { id: req.body.packagingTypeId } });
                if (!pkg) {
                    return res.status(400).json({ error: "Invalid packaging type ID" });
                }
            }
            if (!flavor) {
                return res.status(400).json({ error: "Invalid flavor ID" });
            }
        }
        // If SKU is changed, check it's not already in use
        if (sku && sku !== existingProduct.sku) {
            const existingSku = await client_1.prisma.product.findUnique({
                where: { sku },
            });
            if (existingSku && existingSku.id !== id) {
                return res.status(400).json({ error: "SKU already exists" });
            }
        }
        const product = await client_1.prisma.product.update({
            where: { id },
            data: {
                name,
                description,
                categoryId,
                packagingTypeId,
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
        logger_1.logger.controller.update("Product", product.id, { name: product.name });
        await (0, audit_1.logActivity)({
            type: "product",
            action: "updated",
            entity: "Product",
            entityId: product.id,
            userId: req.user?.publicId,
            meta: { name: product.name }
        });
        try {
            const userId = req.user?.publicId;
            if (userId) {
                const updated = await client_1.prisma.notification.create({
                    data: {
                        userId,
                        type: "PRODUCT_UPDATED",
                        message: `Updated product ${product.name}`,
                    },
                });
                await (0, NotificationsController_1.emitUserNotification)(userId.toString(), { event: "created", notification: updated });
                if (product.minStockLevel != null && product.totalStock <= product.minStockLevel) {
                    const low = await client_1.prisma.notification.create({
                        data: {
                            userId,
                            type: "LOW_STOCK",
                            message: `${product.name} is at or below minimum stock`,
                        },
                    });
                    await (0, NotificationsController_1.emitUserNotification)(userId.toString(), { event: "created", notification: low });
                }
            }
        }
        catch { }
        res.json(product);
    }
    catch (error) {
        logger_1.logger.error("Error updating product:", error);
        if (error.code === "P2002") {
            return res
                .status(400)
                .json({ error: "A product with this SKU already exists" });
        }
        res.status(500).json({ error: "Failed to update product" });
    }
};
exports.updateProduct = updateProduct;
const updateProductStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { totalStock } = req.body;
        if (typeof totalStock !== "number" || totalStock < 0) {
            return res.status(400).json({ error: "Invalid stock value" });
        }
        const product = await client_1.prisma.product.update({
            where: { id },
            data: { totalStock },
        });
        res.json(product);
    }
    catch (error) {
        logger_1.logger.error("Error updating product stock:", error);
        res.status(500).json({ error: "Failed to update product stock" });
    }
};
exports.updateProductStock = updateProductStock;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft delete - mark as inactive
        await client_1.prisma.product.update({
            where: { id },
            data: {
                isActive: false,
            },
        });
        res.json({ message: "Product deactivated successfully" });
    }
    catch (error) {
        logger_1.logger.error("Error deactivating product:", error);
        res.status(500).json({ error: "Failed to delete product" });
    }
};
exports.deleteProduct = deleteProduct;
const hardDeleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if there are any related restock requests
        const relatedRequests = await client_1.prisma.restockRequest.findMany({
            where: { productId: id },
        });
        if (relatedRequests.length > 0) {
            return res.status(400).json({
                error: "Cannot delete product with existing restock requests",
                count: relatedRequests.length,
            });
        }
        // Hard delete - remove from database
        const product = await client_1.prisma.product.findUnique({ where: { id } });
        await client_1.prisma.product.delete({
            where: { id },
        });
        const productCount = await client_1.prisma.product.count();
        res.json({
            message: `${product?.name} has been successfully deleted`,
            count: productCount,
        });
    }
    catch (error) {
        logger_1.logger.error("Error deleting product:", error);
        res.status(500).json({ error: "Failed to delete product" });
    }
};
exports.hardDeleteProduct = hardDeleteProduct;
const getProductsByFlavor = async (req, res) => {
    try {
        const { flavorId } = req.params;
        // First check if flavor exists
        const flavor = await client_1.prisma.flavor.findUnique({
            where: { id: flavorId },
        });
        if (!flavor) {
            return res.status(404).json({ error: "Flavor not found" });
        }
        const products = await client_1.prisma.product.findMany({
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
    }
    catch (error) {
        logger_1.logger.error("Error fetching products by flavor:", error);
        res.status(500).json({ error: "Failed to fetch products by flavor" });
    }
};
exports.getProductsByFlavor = getProductsByFlavor;
const getLowStockProducts = async (req, res) => {
    try {
        const lowStockProducts = await client_1.prisma.product.findMany({
            where: {
                isActive: true,
                minStockLevel: {
                    not: null,
                },
                totalStock: {
                    lte: client_1.prisma.product.fields.minStockLevel,
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
    }
    catch (error) {
        logger_1.logger.error("Error fetching low stock products:", error);
        res.status(500).json({ error: "Failed to fetch low stock products" });
    }
};
exports.getLowStockProducts = getLowStockProducts;

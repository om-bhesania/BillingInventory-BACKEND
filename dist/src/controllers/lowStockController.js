"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LowStockController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class LowStockController {
    // Get low stock alerts based on user role
    static async getLowStockAlerts(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const { page = 1, limit = 20, category, flavor, shopId } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;
            const isAdmin = user.role === 'Admin';
            const userShopIds = user.shopIds || [];
            console.log("userShopIds", user.shopIds);
            let whereClause = {
                isActive: true
            };
            // Filter by category if specified
            if (category && category !== 'all') {
                whereClause.product = {
                    category: { name: category }
                };
            }
            // Filter by flavor if specified
            if (flavor && flavor !== 'all') {
                whereClause.product = {
                    ...whereClause.product,
                    flavor: { name: flavor }
                };
            }
            // Filter by shop if specified (Admin can filter by any shop, Shop Owner only their shops)
            if (shopId && shopId !== 'all') {
                if (isAdmin || userShopIds.includes(shopId)) {
                    whereClause.shopId = shopId;
                }
                else {
                    return res.status(403).json({ error: 'Access denied to specified shop' });
                }
            }
            else if (!isAdmin) {
                // Shop Owner can only see their shops
                whereClause.shopId = { in: userShopIds };
            }
            let lowStockItems = [];
            let totalCount = 0;
            if (isAdmin) {
                [lowStockItems, totalCount] = await Promise.all([
                    LowStockController.getAllLowStockItems(whereClause, limitNum, offset),
                    LowStockController.getLowStockItemsCount(whereClause)
                ]);
            }
            else {
                if (userShopIds.length === 0) {
                    // Return empty results for shop owners without shops
                    lowStockItems = [];
                    totalCount = 0;
                }
                else {
                    [lowStockItems, totalCount] = await Promise.all([
                        LowStockController.getShopLowStockItems(userShopIds, whereClause, limitNum, offset),
                        LowStockController.getShopLowStockItemsCount(userShopIds, whereClause)
                    ]);
                }
            }
            const totalPages = Math.ceil(totalCount / limitNum);
            return res.json({
                items: lowStockItems,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalCount,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1
                }
            });
        }
        catch (error) {
            console.error('Low stock alerts error:', error);
            return res.status(500).json({ error: 'Failed to fetch low stock alerts' });
        }
    }
    // Get low stock statistics
    static async getLowStockStats(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const isAdmin = user.role === 'Admin';
            const userShopIds = user.shopIds || [];
            let stats;
            if (isAdmin) {
                stats = await LowStockController.getAllLowStockStats();
            }
            else {
                if (userShopIds.length === 0) {
                    // Return empty stats for shop owners without shops
                    stats = {
                        totalLowStockItems: 0,
                        criticalStockItems: 0,
                        urgencyLevels: { critical: 0, warning: 0 }
                    };
                }
                else {
                    stats = await LowStockController.getShopLowStockStats(userShopIds);
                }
            }
            return res.json({ stats });
        }
        catch (error) {
            console.error('Low stock stats error:', error);
            return res.status(500).json({ error: 'Failed to fetch low stock statistics' });
        }
    }
    // Get available filters for low stock alerts
    static async getLowStockFilters(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const isAdmin = user.role === 'Admin';
            const userShopIds = user.shopIds || [];
            let filters;
            if (isAdmin) {
                filters = await LowStockController.getAllLowStockFilters();
            }
            else {
                if (userShopIds.length === 0) {
                    // Return empty filters for shop owners without shops
                    filters = {
                        categories: [],
                        flavors: []
                    };
                }
                else {
                    filters = await LowStockController.getShopLowStockFilters(userShopIds);
                }
            }
            return res.json({ filters });
        }
        catch (error) {
            console.error('Low stock filters error:', error);
            return res.status(500).json({ error: 'Failed to fetch low stock filters' });
        }
    }
    // Admin methods
    static async getAllLowStockItems(whereClause, limit, offset) {
        const lowStockItems = await prisma.shopInventory.findMany({
            where: {
                ...whereClause,
                currentStock: {
                    lte: 10 // Use a default value instead of prisma.product.fields.minStockLevel
                }
            },
            include: {
                product: {
                    include: {
                        category: true,
                        flavor: true
                    }
                },
                shop: true
            },
            orderBy: [
                { currentStock: 'asc' },
                { updatedAt: 'desc' }
            ],
            take: limit,
            skip: offset
        });
        return lowStockItems.map(item => ({
            id: item.id,
            shopId: item.shopId,
            shopName: item.shop.name,
            productId: item.productId,
            productName: item.product.name,
            category: item.product.category.name,
            flavor: item.product.flavor.name,
            currentStock: item.currentStock,
            minStockLevel: item.product.minStockLevel || 10,
            stockDeficit: (item.product.minStockLevel || 10) - item.currentStock,
            lastRestockDate: item.lastRestockDate,
            urgency: LowStockController.calculateUrgency(item.currentStock, item.product.minStockLevel || 10)
        }));
    }
    static async getLowStockItemsCount(whereClause) {
        return await prisma.shopInventory.count({
            where: {
                ...whereClause,
                currentStock: {
                    lte: 10 // Use a default value instead of prisma.product.fields.minStockLevel
                }
            }
        });
    }
    static async getAllLowStockStats() {
        const totalLowStockItems = await prisma.shopInventory.count({
            where: {
                isActive: true,
                currentStock: {
                    lte: 10 // Use a default value instead of prisma.product.fields.minStockLevel
                }
            }
        });
        const criticalStockItems = await prisma.shopInventory.count({
            where: {
                isActive: true,
                currentStock: {
                    lte: 5
                }
            }
        });
        const shopsWithLowStock = await prisma.shopInventory.groupBy({
            by: ['shopId'],
            where: {
                isActive: true,
                currentStock: {
                    lte: 10 // Use a default value instead of prisma.product.fields.minStockLevel
                }
            }
        });
        return {
            totalLowStockItems,
            criticalStockItems,
            affectedShops: shopsWithLowStock.length,
            urgencyLevels: {
                critical: criticalStockItems,
                warning: totalLowStockItems - criticalStockItems
            }
        };
    }
    static async getAllLowStockFilters() {
        const [categories, flavors, shops] = await Promise.all([
            prisma.category.findMany({
                where: { isActive: true },
                select: { name: true }
            }),
            prisma.flavor.findMany({
                where: { isActive: true },
                select: { name: true }
            }),
            prisma.shop.findMany({
                where: { isActive: true },
                select: { id: true, name: true }
            })
        ]);
        return {
            categories: categories.map(c => c.name),
            flavors: flavors.map(f => f.name),
            shops: shops.map(s => ({ id: s.id, name: s.name }))
        };
    }
    // Shop Owner methods
    static async getShopLowStockItems(shopIds, whereClause, limit, offset) {
        const lowStockItems = await prisma.shopInventory.findMany({
            where: {
                ...whereClause,
                shopId: { in: shopIds },
                currentStock: {
                    lte: 10 // Use a default value instead of prisma.product.fields.minStockLevel
                }
            },
            include: {
                product: {
                    include: {
                        category: true,
                        flavor: true
                    }
                }
            },
            orderBy: [
                { currentStock: 'asc' },
                { updatedAt: 'desc' }
            ],
            take: limit,
            skip: offset
        });
        return lowStockItems.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            category: item.product.category.name,
            flavor: item.product.flavor.name,
            currentStock: item.currentStock,
            minStockLevel: item.product.minStockLevel || 10,
            stockDeficit: (item.product.minStockLevel || 10) - item.currentStock,
            lastRestockDate: item.lastRestockDate,
            urgency: LowStockController.calculateUrgency(item.currentStock, item.product.minStockLevel || 10)
        }));
    }
    static async getShopLowStockItemsCount(shopIds, whereClause) {
        return await prisma.shopInventory.count({
            where: {
                ...whereClause,
                shopId: { in: shopIds },
                currentStock: {
                    lte: 10 // Use a default value instead of prisma.product.fields.minStockLevel
                }
            }
        });
    }
    static async getShopLowStockStats(shopIds) {
        const totalLowStockItems = await prisma.shopInventory.count({
            where: {
                shopId: { in: shopIds },
                isActive: true,
                currentStock: {
                    lte: 10 // Use a default value instead of prisma.product.fields.minStockLevel
                }
            }
        });
        const criticalStockItems = await prisma.shopInventory.count({
            where: {
                shopId: { in: shopIds },
                isActive: true,
                currentStock: {
                    lte: 5
                }
            }
        });
        return {
            totalLowStockItems,
            criticalStockItems,
            urgencyLevels: {
                critical: criticalStockItems,
                warning: totalLowStockItems - criticalStockItems
            }
        };
    }
    static async getShopLowStockFilters(shopIds) {
        const [categories, flavors] = await Promise.all([
            prisma.category.findMany({
                where: { isActive: true },
                select: { name: true }
            }),
            prisma.flavor.findMany({
                where: { isActive: true },
                select: { name: true }
            })
        ]);
        return {
            categories: categories.map(c => c.name),
            flavors: flavors.map(f => f.name)
        };
    }
    // Utility method to calculate urgency level
    static calculateUrgency(currentStock, minStockLevel) {
        const deficit = minStockLevel - currentStock;
        const percentage = (currentStock / minStockLevel) * 100;
        if (currentStock <= 5 || percentage <= 25) {
            return 'critical';
        }
        else if (currentStock <= minStockLevel * 0.5 || percentage <= 50) {
            return 'low';
        }
        else {
            return 'warning';
        }
    }
}
exports.LowStockController = LowStockController;

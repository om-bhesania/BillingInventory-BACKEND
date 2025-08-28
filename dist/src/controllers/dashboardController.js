"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DashboardController {
    // Get dashboard metrics based on user role
    static async getDashboardMetrics(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            // Check if user has a role
            if (!user.role) {
                return res.status(403).json({ error: 'User role not defined' });
            }
            const isAdmin = user.role === 'Admin';
            // Get shop IDs from managedShops for Shop Owners
            const userShopIds = user.managedShops?.map(shop => shop.id) || [];
            if (isAdmin) {
                // Admin metrics - all shops
                const [totalRevenue, totalShops, totalProducts, totalCategories, pendingRestockRequests, shopPerformance, systemNotifications, bestCategory, bestFlavor, categoryBreakdown, flavorBreakdown, salesTrend] = await Promise.all([
                    DashboardController.getTotalRevenue(),
                    DashboardController.getTotalShops(),
                    DashboardController.getTotalProducts(),
                    DashboardController.getTotalCategories(),
                    DashboardController.getPendingRestockRequests(),
                    DashboardController.getShopPerformance(),
                    DashboardController.getSystemNotifications(),
                    DashboardController.getTopSellingCategory(),
                    DashboardController.getTopSellingFlavor(),
                    DashboardController.getCategoryBreakdown(),
                    DashboardController.getFlavorBreakdown(),
                    DashboardController.getSalesTrend()
                ]);
                return res.json({
                    role: 'Admin',
                    metrics: {
                        totalRevenue,
                        totalShops,
                        totalProducts,
                        totalCategories,
                        pendingRestockRequests,
                        shopPerformance,
                        systemNotifications,
                        bestCategory,
                        bestFlavor,
                        categoryBreakdown,
                        flavorBreakdown,
                        salesTrend
                    }
                });
            }
            else {
                // Shop Owner metrics - restricted to their shops
                if (userShopIds.length === 0) {
                    // Return empty metrics for shop owners without shops instead of error
                    return res.json({
                        role: 'Shop_Owner',
                        metrics: {
                            shopRevenue: { total: 0, count: 0, growth: 0 },
                            topSellingProducts: [],
                            currentStockLevels: { totalItems: 0, lowStockItems: [], lowStockCount: 0 },
                            pendingRestockRequests: { count: 0, requests: [] },
                            shopNotifications: { count: 0, notifications: [] },
                            restockExpenses: { total: 0, count: 0 }
                        }
                    });
                }
                const [shopRevenue, topSellingProducts, currentStockLevels, pendingRestockRequests, shopNotifications, bestCategory, bestFlavor, categoryBreakdown, flavorBreakdown, salesTrend, restockExpenses] = await Promise.all([
                    DashboardController.getShopRevenue(userShopIds),
                    DashboardController.getTopSellingProducts(userShopIds),
                    DashboardController.getCurrentStockLevels(userShopIds),
                    DashboardController.getPendingRestockRequests(userShopIds),
                    DashboardController.getShopNotifications(userShopIds),
                    DashboardController.getTopSellingCategory(userShopIds),
                    DashboardController.getTopSellingFlavor(userShopIds),
                    DashboardController.getCategoryBreakdown(userShopIds),
                    DashboardController.getFlavorBreakdown(userShopIds),
                    DashboardController.getSalesTrend(userShopIds),
                    DashboardController.getRestockExpenses(userShopIds)
                ]);
                return res.json({
                    role: 'Shop_Owner',
                    metrics: {
                        shopRevenue,
                        topSellingProducts,
                        currentStockLevels,
                        pendingRestockRequests,
                        shopNotifications,
                        bestCategory,
                        bestFlavor,
                        categoryBreakdown,
                        flavorBreakdown,
                        salesTrend,
                        restockExpenses
                    }
                });
            }
        }
        catch (error) {
            console.error('Dashboard metrics error:', error);
            return res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
        }
    }
    // Get recent activities for dashboard
    static async getRecentActivities(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            // Check if user has a role
            if (!user.role) {
                return res.status(403).json({ error: 'User role not defined' });
            }
            const isAdmin = user.role === 'Admin';
            const userShopIds = user.shopIds || [];
            // Prefer AuditLog if available
            const whereClause = isAdmin ? {} : { shopId: { in: userShopIds } };
            let auditLogs = [];
            try {
                auditLogs = await prisma.auditLog.findMany({
                    where: whereClause,
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                });
            }
            catch { }
            if (auditLogs.length > 0) {
                const mapped = auditLogs.map(l => ({
                    type: l.type,
                    action: l.action,
                    details: l.meta?.details || l.entity,
                    amount: l.meta?.amount,
                    status: l.meta?.status,
                    timestamp: l.createdAt,
                    shopName: l.meta?.shopName
                }));
                return res.json({ activities: mapped });
            }
            // Fallback to synthesized activities
            let activities = [];
            if (isAdmin)
                activities = await DashboardController.getAllRecentActivities();
            else
                activities = userShopIds.length === 0 ? [] : await DashboardController.getShopRecentActivities(userShopIds);
            return res.json({ activities });
        }
        catch (error) {
            console.error('Recent activities error:', error);
            return res.status(500).json({ error: 'Failed to fetch recent activities' });
        }
    }
    // Admin-only methods
    static async getTotalRevenue() {
        // For Admin: Calculate revenue from fulfilled restock requests (when products are delivered)
        // This represents the revenue from selling products to shops
        const fulfilledRestockRequests = await prisma.restockRequest.findMany({
            where: {
                status: "fulfilled"
            },
            include: {
                product: true
            }
        });
        // Calculate total revenue from fulfilled restock requests
        let currentRevenue = 0;
        for (const request of fulfilledRestockRequests) {
            // Revenue = requested amount * product unit price
            currentRevenue += request.requestedAmount * request.product.unitPrice;
        }
        // Calculate last month's revenue for growth calculation
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthFulfilledRequests = await prisma.restockRequest.findMany({
            where: {
                status: "fulfilled",
                updatedAt: { gte: lastMonth }
            },
            include: {
                product: true
            }
        });
        let lastMonthRevenue = 0;
        for (const request of lastMonthFulfilledRequests) {
            lastMonthRevenue += request.requestedAmount * request.product.unitPrice;
        }
        const growth = lastMonthRevenue > 0 ? ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
        return {
            total: currentRevenue,
            count: fulfilledRestockRequests.length,
            growth: Math.round(growth * 100) / 100
        };
    }
    static async getTotalShops() {
        const result = await prisma.shop.aggregate({
            _count: { id: true },
            where: { isActive: true }
        });
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthShops = await prisma.shop.count({
            where: {
                isActive: true,
                createdAt: { lt: lastMonth }
            }
        });
        const currentShops = result._count.id;
        const growth = lastMonthShops > 0 ? ((currentShops - lastMonthShops) / lastMonthShops) * 100 : 0;
        return {
            total: currentShops,
            growth: Math.round(growth * 100) / 100
        };
    }
    static async getTotalProducts() {
        const result = await prisma.product.aggregate({
            _count: { id: true },
            where: { isActive: true }
        });
        return { total: result._count.id };
    }
    static async getTotalCategories() {
        const result = await prisma.category.aggregate({
            _count: { id: true },
            where: { isActive: true }
        });
        return { total: result._count.id };
    }
    static async getPendingRestockRequests(shopIds) {
        const whereClause = {
            status: 'pending',
            hidden: false
        };
        if (shopIds && shopIds.length > 0) {
            whereClause.shopId = { in: shopIds };
        }
        const requests = await prisma.restockRequest.findMany({
            where: whereClause,
            include: {
                product: {
                    include: {
                        category: true,
                        flavor: true
                    }
                },
                shop: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return {
            count: requests.length,
            requests: requests.slice(0, 10) // Limit to 10 for dashboard
        };
    }
    static async getShopPerformance() {
        const shops = await prisma.shop.findMany({
            where: { isActive: true }
        });
        // For Admin: Calculate shop performance based on fulfilled restock requests
        // This shows how much revenue each shop generates for the admin (from buying products)
        const shopPerformance = await Promise.all(shops.map(async (shop) => {
            // Get fulfilled restock requests for this shop
            const fulfilledRequests = await prisma.restockRequest.findMany({
                where: {
                    shopId: shop.id,
                    status: "fulfilled"
                },
                include: {
                    product: true
                }
            });
            // Calculate total revenue from fulfilled restock requests
            let totalRevenue = 0;
            for (const request of fulfilledRequests) {
                totalRevenue += request.requestedAmount * request.product.unitPrice;
            }
            return {
                id: shop.id,
                name: shop.name,
                totalRevenue,
                orderCount: fulfilledRequests.length
            };
        }));
        // Sort by revenue descending
        shopPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);
        return shopPerformance.slice(0, 5); // Top 5 shops
    }
    static async getSystemNotifications() {
        const notifications = await prisma.notification.findMany({
            where: { hidden: false },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        return {
            count: notifications.length,
            notifications: notifications.slice(0, 5) // Limit to 5 for dashboard
        };
    }
    // Shop Owner methods
    static async getShopRevenue(shopIds) {
        // For Shop Owner: Calculate revenue from billing records (invoices created when selling to customers)
        // This shows the revenue from actual sales to customers
        const billings = await prisma.billing.findMany({
            where: {
                shopId: { in: shopIds }
            }
        });
        // Calculate total revenue from billing records
        let currentRevenue = 0;
        for (const billing of billings) {
            currentRevenue += billing.total;
        }
        // Calculate last month's revenue for growth calculation
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthBillings = await prisma.billing.findMany({
            where: {
                shopId: { in: shopIds },
                createdAt: { gte: lastMonth }
            }
        });
        let lastMonthRevenue = 0;
        for (const billing of lastMonthBillings) {
            lastMonthRevenue += billing.total;
        }
        const growth = lastMonthRevenue > 0 ? ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
        return {
            total: currentRevenue,
            count: billings.length,
            growth: Math.round(growth * 100) / 100
        };
    }
    static async getTopSellingProducts(shopIds) {
        // For Shop Owner: Get top selling products from billing records (invoices)
        const billings = await prisma.billing.findMany({
            where: {
                shopId: { in: shopIds }
            },
            select: { items: true }
        });
        // Aggregate product sales from billing items
        const productSales = {};
        billings.forEach(billing => {
            if (billing.items && Array.isArray(billing.items)) {
                billing.items.forEach((item) => {
                    if (item.productId && item.quantity) {
                        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
                    }
                });
            }
        });
        // Get top selling products
        const topProducts = Object.entries(productSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([productId, quantity]) => ({ productId, quantity }));
        // Get product details
        const productIds = topProducts.map(p => p.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            include: {
                category: true,
                flavor: true
            }
        });
        return topProducts.map(top => {
            const product = products.find(p => p.id === top.productId);
            return {
                ...top,
                product: product
            };
        });
    }
    // Get total amount spent on restocks per shop
    static async getRestockExpenses(shopIds) {
        // Calculate total amount spent on fulfilled restock requests
        const fulfilledRequests = await prisma.restockRequest.findMany({
            where: {
                shopId: { in: shopIds },
                status: "fulfilled"
            },
            include: {
                product: true
            }
        });
        // Calculate total expenses from fulfilled restock requests
        let totalExpenses = 0;
        for (const request of fulfilledRequests) {
            // Expense = requested amount * product unit price
            totalExpenses += request.requestedAmount * request.product.unitPrice;
        }
        return {
            total: totalExpenses,
            count: fulfilledRequests.length
        };
    }
    static async getTopSellingCategory(shopIds) {
        if (shopIds && shopIds.length > 0) {
            // For Shop Owner: Use billing data (existing logic)
            const billings = await prisma.billing.findMany({ where: { shopId: { in: shopIds } }, select: { items: true } });
            const categoryCount = {};
            const productIds = new Set();
            billings.forEach(b => {
                if (Array.isArray(b.items)) {
                    b.items.forEach((it) => {
                        if (it.productId && it.quantity)
                            productIds.add(it.productId);
                    });
                }
            });
            const products = await prisma.product.findMany({ where: { id: { in: Array.from(productIds) } }, include: { category: true } });
            const productIdToCategory = {};
            products.forEach(p => { productIdToCategory[p.id] = p.category?.name || "Unknown"; });
            billings.forEach(b => {
                if (Array.isArray(b.items)) {
                    b.items.forEach((it) => {
                        if (it.productId && it.quantity) {
                            const cat = productIdToCategory[it.productId] || "Unknown";
                            categoryCount[cat] = (categoryCount[cat] || 0) + it.quantity;
                        }
                    });
                }
            });
            const best = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
            return best ? { name: best[0], quantity: best[1] } : null;
        }
        else {
            // For Admin: Use fulfilled restock requests data
            const fulfilledRequests = await prisma.restockRequest.findMany({
                where: { status: "fulfilled" },
                include: {
                    product: {
                        include: { category: true }
                    }
                }
            });
            const categoryCount = {};
            fulfilledRequests.forEach(request => {
                const categoryName = request.product.category?.name || "Unknown";
                categoryCount[categoryName] = (categoryCount[categoryName] || 0) + request.requestedAmount;
            });
            const best = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
            return best ? { name: best[0], quantity: best[1] } : null;
        }
    }
    static async getTopSellingFlavor(shopIds) {
        if (shopIds && shopIds.length > 0) {
            // For Shop Owner: Use billing data (existing logic)
            const billings = await prisma.billing.findMany({ where: { shopId: { in: shopIds } }, select: { items: true } });
            const flavorCount = {};
            const productIds = new Set();
            billings.forEach(b => {
                if (Array.isArray(b.items)) {
                    b.items.forEach((it) => {
                        if (it.productId && it.quantity)
                            productIds.add(it.productId);
                    });
                }
            });
            const products = await prisma.product.findMany({ where: { id: { in: Array.from(productIds) } }, include: { flavor: true } });
            const productIdToFlavor = {};
            products.forEach(p => { productIdToFlavor[p.id] = p.flavor?.name || "Unknown"; });
            billings.forEach(b => {
                if (Array.isArray(b.items)) {
                    b.items.forEach((it) => {
                        if (it.productId && it.quantity) {
                            const flv = productIdToFlavor[it.productId] || "Unknown";
                            flavorCount[flv] = (flavorCount[flv] || 0) + it.quantity;
                        }
                    });
                }
            });
            const best = Object.entries(flavorCount).sort((a, b) => b[1] - a[1])[0];
            return best ? { name: best[0], quantity: best[1] } : null;
        }
        else {
            // For Admin: Use fulfilled restock requests data
            const fulfilledRequests = await prisma.restockRequest.findMany({
                where: { status: "fulfilled" },
                include: {
                    product: {
                        include: { flavor: true }
                    }
                }
            });
            const flavorCount = {};
            fulfilledRequests.forEach(request => {
                const flavorName = request.product.flavor?.name || "Unknown";
                flavorCount[flavorName] = (flavorCount[flavorName] || 0) + request.requestedAmount;
            });
            const best = Object.entries(flavorCount).sort((a, b) => b[1] - a[1])[0];
            return best ? { name: best[0], quantity: best[1] } : null;
        }
    }
    static async getCategoryBreakdown(shopIds) {
        if (shopIds && shopIds.length > 0) {
            // For Shop Owner: Use billing data (existing logic)
            const billings = await prisma.billing.findMany({ where: { shopId: { in: shopIds } }, select: { items: true } });
            const categoryCount = {};
            const productIds = new Set();
            billings.forEach(b => {
                if (Array.isArray(b.items))
                    b.items.forEach((it) => { if (it.productId && it.quantity)
                        productIds.add(it.productId); });
            });
            const products = await prisma.product.findMany({ where: { id: { in: Array.from(productIds) } }, include: { category: true } });
            const productIdToCategory = {};
            products.forEach(p => { productIdToCategory[p.id] = p.category?.name || "Unknown"; });
            billings.forEach(b => {
                if (Array.isArray(b.items))
                    b.items.forEach((it) => {
                        if (it.productId && it.quantity) {
                            const cat = productIdToCategory[it.productId] || "Unknown";
                            categoryCount[cat] = (categoryCount[cat] || 0) + it.quantity;
                        }
                    });
            });
            return Object.entries(categoryCount).map(([category, quantity]) => ({ category, quantity }));
        }
        else {
            // For Admin: Use fulfilled restock requests data
            const fulfilledRequests = await prisma.restockRequest.findMany({
                where: { status: "fulfilled" },
                include: {
                    product: {
                        include: { category: true }
                    }
                }
            });
            const categoryCount = {};
            fulfilledRequests.forEach(request => {
                const categoryName = request.product.category?.name || "Unknown";
                categoryCount[categoryName] = (categoryCount[categoryName] || 0) + request.requestedAmount;
            });
            return Object.entries(categoryCount).map(([category, quantity]) => ({ category, quantity }));
        }
    }
    static async getFlavorBreakdown(shopIds) {
        if (shopIds && shopIds.length > 0) {
            // For Shop Owner: Use billing data (existing logic)
            const billings = await prisma.billing.findMany({ where: { shopId: { in: shopIds } }, select: { items: true } });
            const flavorCount = {};
            const productIds = new Set();
            billings.forEach(b => {
                if (Array.isArray(b.items))
                    b.items.forEach((it) => { if (it.productId && it.quantity)
                        productIds.add(it.productId); });
            });
            const products = await prisma.product.findMany({ where: { id: { in: Array.from(productIds) } }, include: { flavor: true } });
            const productIdToFlavor = {};
            products.forEach(p => { productIdToFlavor[p.id] = p.flavor?.name || "Unknown"; });
            billings.forEach(b => {
                if (Array.isArray(b.items))
                    b.items.forEach((it) => {
                        if (it.productId && it.quantity) {
                            const flv = productIdToFlavor[it.productId] || "Unknown";
                            flavorCount[flv] = (flavorCount[flv] || 0) + it.quantity;
                        }
                    });
            });
            return Object.entries(flavorCount).map(([flavor, quantity]) => ({ flavor, quantity }));
        }
        else {
            // For Admin: Use fulfilled restock requests data
            const fulfilledRequests = await prisma.restockRequest.findMany({
                where: { status: "fulfilled" },
                include: {
                    product: {
                        include: { flavor: true }
                    }
                }
            });
            const flavorCount = {};
            fulfilledRequests.forEach(request => {
                const flavorName = request.product.flavor?.name || "Unknown";
                flavorCount[flavorName] = (flavorCount[flavorName] || 0) + request.requestedAmount;
            });
            return Object.entries(flavorCount).map(([flavor, quantity]) => ({ flavor, quantity }));
        }
    }
    static async getSalesTrend(shopIds) {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        if (shopIds && shopIds.length > 0) {
            // For Shop Owner: Use billing data (existing logic)
            const billings = await prisma.billing.findMany({
                where: { shopId: { in: shopIds }, createdAt: { gte: since } },
                select: { total: true, createdAt: true }
            });
            const byDate = {};
            billings.forEach(b => {
                const key = b.createdAt.toISOString().slice(0, 10);
                byDate[key] = (byDate[key] || 0) + (b.total || 0);
            });
            return Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).map(([date, total]) => ({ date, total }));
        }
        else {
            // For Admin: Use fulfilled restock requests data
            const fulfilledRequests = await prisma.restockRequest.findMany({
                where: {
                    status: "fulfilled",
                    updatedAt: { gte: since }
                },
                include: {
                    product: true
                }
            });
            const byDate = {};
            fulfilledRequests.forEach(request => {
                const key = request.updatedAt.toISOString().slice(0, 10);
                const revenue = request.requestedAmount * request.product.unitPrice;
                byDate[key] = (byDate[key] || 0) + revenue;
            });
            return Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).map(([date, total]) => ({ date, total }));
        }
    }
    static async getCurrentStockLevels(shopIds) {
        const stockLevels = await prisma.shopInventory.findMany({
            where: {
                shopId: { in: shopIds },
                isActive: true
            },
            include: {
                product: {
                    include: {
                        category: true,
                        flavor: true
                    }
                }
            }
        });
        // Filter low stock items
        const lowStockItems = stockLevels.filter(item => item.currentStock <= (item.product.minStockLevel || 10));
        return {
            totalItems: stockLevels.length,
            lowStockItems: lowStockItems.slice(0, 10), // Limit to 10 for dashboard
            lowStockCount: lowStockItems.length
        };
    }
    static async getShopNotifications(shopIds) {
        // Get notifications for users associated with these shops
        const users = await prisma.user.findMany({
            where: { shopIds: { hasSome: shopIds } },
            select: { publicId: true }
        });
        const userIds = users.map(u => u.publicId);
        const notifications = await prisma.notification.findMany({
            where: {
                userId: { in: userIds },
                hidden: false
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        return {
            count: notifications.length,
            notifications: notifications.slice(0, 5) // Limit to 5 for dashboard
        };
    }
    // Activity methods
    static async getAllRecentActivities() {
        const activities = [];
        // For Admin: Prioritize fulfilled restock requests (revenue-generating events)
        const fulfilledRestocks = await prisma.restockRequest.findMany({
            where: { status: 'fulfilled' },
            take: 5,
            orderBy: { updatedAt: 'desc' },
            include: { product: true, shop: true }
        });
        activities.push(...fulfilledRestocks.map(restock => ({
            type: 'restock',
            action: 'Restock fulfilled',
            details: `${restock.requestedAmount} units of ${restock.product.name} delivered to ${restock.shop.name}`,
            amount: restock.requestedAmount * restock.product.unitPrice,
            timestamp: restock.updatedAt,
            shopName: restock.shop.name,
            status: restock.status
        })));
        // Get recent billings (secondary priority for Admin)
        const recentBillings = await prisma.billing.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { shop: true }
        });
        activities.push(...recentBillings.map(billing => ({
            type: 'billing',
            action: 'Invoice generated',
            details: `Invoice #${billing.id.slice(0, 8)} for ${billing.shop.name}`,
            amount: billing.total,
            timestamp: billing.createdAt,
            shopName: billing.shop.name
        })));
        // Get other recent restock requests (non-fulfilled)
        const recentRestocks = await prisma.restockRequest.findMany({
            where: { status: { not: 'fulfilled' } },
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { product: true, shop: true }
        });
        activities.push(...recentRestocks.map(restock => ({
            type: 'restock',
            action: 'Restock request',
            details: `${restock.requestedAmount} units of ${restock.product.name}`,
            timestamp: restock.createdAt,
            shopName: restock.shop.name,
            status: restock.status
        })));
        // Sort by timestamp and return top 5
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return activities.slice(0, 5);
    }
    static async getShopRecentActivities(shopIds) {
        const activities = [];
        // Get recent billings for specific shops
        const recentBillings = await prisma.billing.findMany({
            where: { shopId: { in: shopIds } },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { shop: true }
        });
        activities.push(...recentBillings.map(billing => ({
            type: 'billing',
            action: 'Invoice generated',
            details: `Invoice #${billing.id.slice(0, 8)}`,
            amount: billing.total,
            timestamp: billing.createdAt
        })));
        // Get recent restock requests for specific shops
        const recentRestocks = await prisma.restockRequest.findMany({
            where: { shopId: { in: shopIds } },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { product: true }
        });
        activities.push(...recentRestocks.map(restock => ({
            type: 'restock',
            action: 'Restock request',
            details: `${restock.requestedAmount} units of ${restock.product.name}`,
            timestamp: restock.createdAt,
            status: restock.status
        })));
        // Sort by timestamp and return top 5
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return activities.slice(0, 5);
    }
}
exports.DashboardController = DashboardController;

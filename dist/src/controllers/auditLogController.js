"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AuditLogController {
    // Get audit log entries based on user role
    static async getAuditLog(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const { page = 1, limit = 20, type, startDate, endDate } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;
            const isAdmin = user.role === 'Admin';
            const userShopIds = user.shopIds || [];
            let whereClause = {};
            // Filter by type if specified
            if (type && type !== 'all') {
                whereClause.type = type;
            }
            // Filter by date range if specified
            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate) {
                    whereClause.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    whereClause.createdAt.lte = new Date(endDate);
                }
            }
            let auditEntries = [];
            let totalCount = 0;
            if (isAdmin) {
                // Admin sees all audit entries
                [auditEntries, totalCount] = await Promise.all([
                    AuditLogController.getAllAuditEntries(whereClause, limitNum, offset),
                    AuditLogController.getAuditEntriesCount(whereClause)
                ]);
            }
            else {
                // Shop Owner sees only their shop activities
                if (userShopIds.length === 0) {
                    // Return empty results for shop owners without shops
                    auditEntries = [];
                    totalCount = 0;
                }
                else {
                    [auditEntries, totalCount] = await Promise.all([
                        AuditLogController.getShopAuditEntries(userShopIds, whereClause, limitNum, offset),
                        AuditLogController.getShopAuditEntriesCount(userShopIds, whereClause)
                    ]);
                }
            }
            const totalPages = Math.ceil(totalCount / limitNum);
            return res.json({
                entries: auditEntries,
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
            console.error('Audit log error:', error);
            return res.status(500).json({ error: 'Failed to fetch audit log' });
        }
    }
    // Get audit log statistics
    static async getAuditLogStats(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const isAdmin = user.role === 'Admin';
            const userShopIds = user.shopIds || [];
            let stats;
            if (isAdmin) {
                stats = await AuditLogController.getAllAuditStats();
            }
            else {
                if (userShopIds.length === 0) {
                    return res.status(403).json({ error: 'No shops assigned to user' });
                }
                stats = await AuditLogController.getShopAuditStats(userShopIds);
            }
            return res.json({ stats });
        }
        catch (error) {
            console.error('Audit log stats error:', error);
            return res.status(500).json({ error: 'Failed to fetch audit log statistics' });
        }
    }
    // Admin methods
    static async getAllAuditEntries(whereClause, limit, offset) {
        const entries = [];
        // Get detailed audit log entries from AuditLog table
        const auditLogEntries = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
        entries.push(...auditLogEntries.map(audit => ({
            id: audit.id,
            type: audit.type,
            action: audit.action,
            details: audit.metadata?.details || `${audit.action} ${audit.entity}`,
            shopName: audit.shopId ? 'Shop Activity' : 'System Activity',
            timestamp: audit.createdAt,
            status: audit.metadata?.status || 'completed',
            statusDisplay: audit.metadata?.statusDisplay || 'Completed',
            // Enhanced information
            performedBy: 'System', // Will be populated from user lookup if needed
            entityId: audit.entityId,
            entity: audit.entity,
            meta: audit.metadata,
            // Show detailed information based on type
            detailedInfo: audit.metadata?.details || `${audit.action} ${audit.entity} by System`
        })));
        // Get billing activities
        const billingEntries = await prisma.billing.findMany({
            where: whereClause,
            include: {
                shop: true
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
        entries.push(...billingEntries.map(billing => ({
            id: billing.id,
            type: 'billing',
            action: 'Invoice Generated',
            details: `Invoice #${billing.id.slice(0, 8)} for ${billing.shop?.name || 'Factory Invoice'}`,
            amount: billing.total,
            shopName: billing.shop?.name || 'Factory Invoice',
            timestamp: billing.createdAt,
            status: billing.paymentStatus
        })));
        // Get restock request activities
        const restockEntries = await prisma.restockRequest.findMany({
            where: whereClause,
            include: {
                product: true,
                shop: true
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
        entries.push(...restockEntries.map(restock => ({
            id: restock.id,
            type: 'restock',
            action: 'Restock Request',
            details: `${restock.requestedAmount} units of ${restock.product.name}`,
            shopName: restock.shop.name,
            timestamp: restock.createdAt,
            status: restock.status,
            // Enhanced status display
            statusDisplay: restock.status === 'waiting_for_approval' ? 'Waiting for Approval' :
                restock.status === 'approved_pending' ? 'Approved (Pending)' :
                    restock.status === 'fulfilled' ? 'Fulfilled' :
                        restock.status === 'rejected' ? 'Rejected' : restock.status
        })));
        // Get inventory update activities
        const inventoryEntries = await prisma.shopInventory.findMany({
            where: whereClause,
            include: {
                product: true,
                shop: true
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: offset
        });
        entries.push(...inventoryEntries.map(inventory => ({
            id: inventory.id,
            type: 'inventory',
            action: 'Stock Updated',
            details: `Stock level updated to ${inventory.currentStock} for ${inventory.product.name}`,
            shopName: inventory.shop.name,
            timestamp: inventory.updatedAt,
            status: 'updated',
            statusDisplay: 'Updated'
        })));
        // Get user activity (login/logout, role changes, etc.)
        const userEntries = await prisma.user.findMany({
            where: whereClause,
            take: limit,
            skip: offset
        });
        entries.push(...userEntries.map(user => ({
            id: user.publicId,
            type: 'user',
            action: 'User Activity',
            details: `User ${user.name || user.email} activity`,
            timestamp: new Date(), // Use current date since User model doesn't have updatedAt
            status: 'active'
        })));
        // Sort by timestamp and return
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return entries.slice(0, limit);
    }
    static async getAuditEntriesCount(whereClause) {
        const [auditLogCount, billingCount, restockCount, inventoryCount, userCount] = await Promise.all([
            prisma.auditLog.count({ where: whereClause }),
            prisma.billing.count({ where: whereClause }),
            prisma.restockRequest.count({ where: whereClause }),
            prisma.shopInventory.count({ where: whereClause }),
            prisma.user.count({ where: whereClause })
        ]);
        return auditLogCount + billingCount + restockCount + inventoryCount + userCount;
    }
    static async getAllAuditStats() {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalBillings, totalRestocks, totalInventoryUpdates] = await Promise.all([
            prisma.billing.count(),
            prisma.restockRequest.count(),
            prisma.shopInventory.count()
        ]);
        const [recentBillings, recentRestocks, recentInventoryUpdates] = await Promise.all([
            prisma.billing.count({ where: { createdAt: { gte: lastWeek } } }),
            prisma.restockRequest.count({ where: { createdAt: { gte: lastWeek } } }),
            prisma.shopInventory.count({ where: { updatedAt: { gte: lastWeek } } })
        ]);
        const [monthlyBillings, monthlyRestocks, monthlyInventoryUpdates] = await Promise.all([
            prisma.billing.count({ where: { createdAt: { gte: lastMonth } } }),
            prisma.restockRequest.count({ where: { createdAt: { gte: lastMonth } } }),
            prisma.shopInventory.count({ where: { updatedAt: { gte: lastMonth } } })
        ]);
        return {
            total: {
                billings: totalBillings,
                restocks: totalRestocks,
                inventoryUpdates: totalInventoryUpdates
            },
            recent: {
                billings: recentBillings,
                restocks: recentRestocks,
                inventoryUpdates: recentInventoryUpdates
            },
            monthly: {
                billings: monthlyBillings,
                restocks: monthlyRestocks,
                inventoryUpdates: monthlyInventoryUpdates
            }
        };
    }
    // Shop Owner methods
    static async getShopAuditEntries(shopIds, whereClause, limit, offset) {
        const entries = [];
        // Get shop information for display
        const shops = await prisma.shop.findMany({
            where: { id: { in: shopIds } },
            select: { id: true, name: true }
        });
        const shopMap = new Map(shops.map(shop => [shop.id, shop.name]));
        // Get detailed audit log entries from AuditLog table for specific shops
        const auditLogEntries = await prisma.auditLog.findMany({
            where: {
                ...whereClause,
                shopId: { in: shopIds }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
        entries.push(...auditLogEntries.map(audit => ({
            id: audit.id,
            type: audit.type,
            action: audit.action,
            details: audit.metadata?.details || `${audit.action} ${audit.entity}`,
            shopName: audit.shopId ? shopMap.get(audit.shopId) || 'Unknown Shop' : 'System Activity',
            timestamp: audit.createdAt,
            status: audit.metadata?.status || 'completed',
            statusDisplay: audit.metadata?.statusDisplay || 'Completed',
            // Enhanced information
            performedBy: audit.metadata?.actionPerformedBy || 'System',
            entityId: audit.entityId,
            entity: audit.entity,
            meta: audit.metadata,
            // Show detailed information based on type
            detailedInfo: audit.metadata?.details || `${audit.action} ${audit.entity} by ${audit.metadata?.actionPerformedBy || 'System'}`
        })));
        // Get billing activities for specific shops
        const billingEntries = await prisma.billing.findMany({
            where: {
                ...whereClause,
                shopId: { in: shopIds }
            },
            include: {
                shop: true
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
        entries.push(...billingEntries.map(billing => ({
            id: billing.id,
            type: 'billing',
            action: 'Invoice Generated',
            details: `Invoice #${billing.id.slice(0, 8)} for ${billing.shop?.name || 'Unknown Shop'}`,
            amount: billing.total,
            shopName: billing.shop?.name || 'Unknown Shop',
            timestamp: billing.createdAt,
            status: billing.paymentStatus,
            statusDisplay: billing.paymentStatus === 'pending' ? 'Pending' :
                billing.paymentStatus === 'paid' ? 'Paid' :
                    billing.paymentStatus === 'failed' ? 'Failed' : billing.paymentStatus,
            performedBy: billing.createdBy || 'System'
        })));
        // Get restock request activities for specific shops
        const restockEntries = await prisma.restockRequest.findMany({
            where: {
                ...whereClause,
                shopId: { in: shopIds }
            },
            include: {
                product: true,
                shop: true
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
        entries.push(...restockEntries.map(restock => ({
            id: restock.id,
            type: 'restock',
            action: 'Restock Request',
            details: `${restock.requestedAmount} units of ${restock.product.name} for ${restock.shop?.name || 'Unknown Shop'}`,
            shopName: restock.shop?.name || 'Unknown Shop',
            timestamp: restock.createdAt,
            status: restock.status,
            statusDisplay: restock.status === 'waiting_for_approval' ? 'Waiting for Approval' :
                restock.status === 'approved_pending' ? 'Approved (Pending)' :
                    restock.status === 'fulfilled' ? 'Fulfilled' :
                        restock.status === 'rejected' ? 'Rejected' : restock.status,
            performedBy: 'Shop Owner'
        })));
        // Get inventory update activities for specific shops
        const inventoryEntries = await prisma.shopInventory.findMany({
            where: {
                ...whereClause,
                shopId: { in: shopIds }
            },
            include: {
                product: true,
                shop: true
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: offset
        });
        entries.push(...inventoryEntries.map(inventory => ({
            id: inventory.id,
            type: 'inventory',
            action: 'Stock Updated',
            details: `Stock level updated to ${inventory.currentStock} for ${inventory.product.name} in ${inventory.shop?.name || 'Unknown Shop'}`,
            shopName: inventory.shop?.name || 'Unknown Shop',
            timestamp: inventory.updatedAt,
            status: 'updated',
            statusDisplay: 'Updated',
            performedBy: 'Shop Owner'
        })));
        // Sort by timestamp and return
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return entries.slice(0, limit);
    }
    static async getShopAuditEntriesCount(shopIds, whereClause) {
        const [auditLogCount, billingCount, restockCount, inventoryCount] = await Promise.all([
            prisma.auditLog.count({
                where: { ...whereClause, shopId: { in: shopIds } }
            }),
            prisma.billing.count({
                where: { ...whereClause, shopId: { in: shopIds } }
            }),
            prisma.restockRequest.count({
                where: { ...whereClause, shopId: { in: shopIds } }
            }),
            prisma.shopInventory.count({
                where: { ...whereClause, shopId: { in: shopIds } }
            })
        ]);
        return auditLogCount + billingCount + restockCount + inventoryCount;
    }
    static async getShopAuditStats(shopIds) {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalBillings, totalRestocks, totalInventoryUpdates] = await Promise.all([
            prisma.billing.count({ where: { shopId: { in: shopIds } } }),
            prisma.restockRequest.count({ where: { shopId: { in: shopIds } } }),
            prisma.shopInventory.count({ where: { shopId: { in: shopIds } } })
        ]);
        const [recentBillings, recentRestocks, recentInventoryUpdates] = await Promise.all([
            prisma.billing.count({
                where: { shopId: { in: shopIds }, createdAt: { gte: lastWeek } }
            }),
            prisma.restockRequest.count({
                where: { shopId: { in: shopIds }, createdAt: { gte: lastWeek } }
            }),
            prisma.shopInventory.count({
                where: { shopId: { in: shopIds }, updatedAt: { gte: lastWeek } }
            })
        ]);
        const [monthlyBillings, monthlyRestocks, monthlyInventoryUpdates] = await Promise.all([
            prisma.billing.count({
                where: { shopId: { in: shopIds }, createdAt: { gte: lastMonth } }
            }),
            prisma.restockRequest.count({
                where: { shopId: { in: shopIds }, createdAt: { gte: lastMonth } }
            }),
            prisma.shopInventory.count({
                where: { shopId: { in: shopIds }, updatedAt: { gte: lastMonth } }
            })
        ]);
        return {
            total: {
                billings: totalBillings,
                restocks: totalRestocks,
                inventoryUpdates: totalInventoryUpdates
            },
            recent: {
                billings: recentBillings,
                restocks: recentRestocks,
                inventoryUpdates: recentInventoryUpdates
            },
            monthly: {
                billings: monthlyBillings,
                restocks: monthlyRestocks,
                inventoryUpdates: monthlyInventoryUpdates
            }
        };
    }
}
exports.AuditLogController = AuditLogController;

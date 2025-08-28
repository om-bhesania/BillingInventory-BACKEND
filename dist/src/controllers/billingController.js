"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingStats = exports.updateBillingPaymentStatus = exports.getBillingById = exports.getBillings = exports.createBilling = void 0;
const client_1 = require("../config/client");
const logger_1 = require("../utils/logger");
const roles_1 = require("../config/roles");
const NotificationsController_1 = require("./NotificationsController");
const audit_1 = require("../utils/audit");
// Create billing
const createBilling = async (req, res) => {
    try {
        const { shopId, invoiceNumber, customerName, customerEmail, items, subtotal, tax = 0, discount = 0, total, } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        // Check if user has access to this shop
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        // Check if user manages this shop by querying directly
        const managedShop = await client_1.prisma.shop.findFirst({
            where: {
                id: shopId,
                managerId: user.publicId
            },
        });
        const userShopId = managedShop?.id;
        if (!user.role || (!(0, roles_1.isAdmin)(user.role) && shopId !== userShopId)) {
            res.status(403).json({ error: "Access denied to this shop" });
            return;
        }
        // Check if shop exists
        const shop = await client_1.prisma.shop.findUnique({
            where: { id: shopId },
        });
        if (!shop) {
            res.status(404).json({ error: "Shop not found" });
            return;
        }
        // Validate items and check stock
        const validatedItems = [];
        const stockUpdates = [];
        for (const item of items) {
            const { productId, quantity, unitPrice } = item;
            // Check if product exists
            const product = await client_1.prisma.product.findUnique({
                where: { id: productId },
            });
            if (!product) {
                res.status(400).json({ error: `Product ${productId} not found` });
                return;
            }
            // Check shop inventory stock
            const shopInventory = await client_1.prisma.shopInventory.findFirst({
                where: {
                    shopId,
                    productId,
                },
            });
            if (!shopInventory) {
                res.status(400).json({ error: `Product ${product.name} not available in this shop` });
                return;
            }
            if (shopInventory.currentStock < quantity) {
                res.status(400).json({
                    error: `Insufficient stock for ${product.name}. Available: ${shopInventory.currentStock}, Requested: ${quantity}`
                });
                return;
            }
            // Calculate item total
            const itemTotal = quantity * unitPrice;
            validatedItems.push({
                ...item,
                total: itemTotal,
            });
            // Prepare stock update
            stockUpdates.push({
                inventoryId: shopInventory.id,
                newStock: shopInventory.currentStock - quantity,
            });
        }
        // Create billing transaction (backward-compatible with/without createdBy fields)
        // Auto-generate invoice number if not provided: BLISS/YYYY/00001
        let nextInvoiceNumber = invoiceNumber;
        if (!nextInvoiceNumber) {
            try {
                const year = new Date().getFullYear();
                const prefix = `BLIZZ/${year}`;
                const latest = await client_1.prisma.billing.findFirst({
                    where: { invoiceNumber: { startsWith: prefix } },
                    orderBy: [{ createdAt: "desc" }],
                    select: { invoiceNumber: true },
                });
                const lastSeq = (() => {
                    const raw = latest?.invoiceNumber || "";
                    const parts = raw.split("/");
                    const tail = parts[2] || "00000";
                    const n = parseInt(tail, 10);
                    return Number.isFinite(n) ? n : 0;
                })();
                const nextSeq = String(lastSeq + 1).padStart(5, "0");
                nextInvoiceNumber = `${prefix}/${nextSeq}`;
            }
            catch { }
        }
        const baseData = {
            shopId,
            customerName,
            customerEmail,
            items: validatedItems,
            subtotal,
            tax,
            discount,
            total,
            paymentStatus: "pending",
        };
        // Prefer tagging creator if the schema supports it. Fallback if not.
        let billing;
        try {
            const extendedData = {
                ...baseData,
                invoiceNumber: nextInvoiceNumber || null,
                createdBy: user.publicId,
                createdByRole: user.role || null,
            };
            billing = await client_1.prisma.billing.create({
                data: extendedData,
                include: { shop: true },
            });
        }
        catch (_err) {
            // If the DB/schema doesn't have these columns yet, create without them
            billing = await client_1.prisma.billing.create({
                data: baseData,
                include: { shop: true },
            });
        }
        // Update stock levels
        for (const update of stockUpdates) {
            await client_1.prisma.shopInventory.update({
                where: { id: update.inventoryId },
                data: {
                    currentStock: update.newStock,
                    isActive: true,
                    updatedAt: new Date(),
                },
            });
        }
        // Do NOT decrement factory-level product.totalStock on billing.
        // Factory stock is decremented when restock requests are approved/in_transit.
        // Check for low stock after sale and trigger notifications
        for (const item of validatedItems) {
            const shopInventory = await client_1.prisma.shopInventory.findFirst({
                where: {
                    shopId,
                    productId: item.productId,
                    isActive: true,
                },
            });
            if (shopInventory) {
                const product = await client_1.prisma.product.findUnique({
                    where: { id: item.productId },
                });
                if (product && product.minStockLevel &&
                    shopInventory.currentStock <= product.minStockLevel) {
                    const notificationMessage = `Low stock alert after sale: ${product.name} in ${shop.name} has only ${shopInventory.currentStock} units remaining (min: ${product.minStockLevel})`;
                    // Notify shop manager
                    if (shop.managerId) {
                        await client_1.prisma.notification.create({
                            data: {
                                userId: shop.managerId,
                                type: "LOW_STOCK",
                                message: notificationMessage,
                            },
                        });
                        (0, NotificationsController_1.emitUserNotification)(shop.managerId, {
                            event: "created",
                            notification: {
                                type: "LOW_STOCK",
                                message: notificationMessage,
                            },
                        });
                    }
                }
            }
        }
        // Trigger invoice notification
        const invoiceMessage = `Invoice generated for ${shop.name}: ${customerName || 'Customer'} - Total: $${total}`;
        if (shop.managerId) {
            await client_1.prisma.notification.create({
                data: {
                    userId: shop.managerId,
                    type: "INVOICE",
                    message: invoiceMessage,
                },
            });
            (0, NotificationsController_1.emitUserNotification)(shop.managerId, {
                event: "created",
                notification: {
                    type: "INVOICE",
                    message: invoiceMessage,
                },
            });
        }
        // Audit
        await (0, audit_1.logActivity)({
            type: "billing",
            action: "created",
            entity: "Billing",
            entityId: billing.id,
            userId: req.user?.publicId,
            shopId,
            meta: { total }
        });
        res.status(201).json(billing);
    }
    catch (error) {
        logger_1.logger.error("Error creating billing:", error);
        res.status(500).json({ error: "Failed to create billing" });
    }
};
exports.createBilling = createBilling;
// Get billings by shop ID
const getBillings = async (req, res) => {
    try {
        const { shopId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        // Admins can view any shop's billings without shop assignment
        if (!(0, roles_1.isAdmin)(user.role || "")) {
            // Check if user manages this shop by querying directly
            const managedShop = await client_1.prisma.shop.findFirst({
                where: {
                    id: shopId,
                    managerId: user.publicId
                },
            });
            const userShopId = managedShop?.id;
            if (!user.role || shopId !== userShopId) {
                res.status(403).json({ error: "Access denied to this shop" });
                return;
            }
        }
        const billings = await client_1.prisma.billing.findMany({
            where: { shopId },
            include: { shop: true },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(billings);
    }
    catch (error) {
        logger_1.logger.error("Error fetching billings:", error);
        res.status(500).json({ error: "Failed to fetch billings" });
    }
};
exports.getBillings = getBillings;
// Get billing by ID
const getBillingById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        const billing = await client_1.prisma.billing.findUnique({
            where: { id },
            include: {
                shop: true,
            },
        });
        if (!billing) {
            res.status(404).json({ error: "Billing not found" });
            return;
        }
        // Check if user manages this shop by querying directly
        const managedShop = await client_1.prisma.shop.findFirst({
            where: {
                id: billing.shopId,
                managerId: user.publicId
            },
        });
        const userShopId = managedShop?.id;
        if (!user.role || (!(0, roles_1.isAdmin)(user.role) && billing.shopId !== userShopId)) {
            res.status(403).json({ error: "Access denied to this billing" });
            return;
        }
        res.status(200).json(billing);
    }
    catch (error) {
        logger_1.logger.error("Error fetching billing:", error);
        res.status(500).json({ error: "Failed to fetch billing" });
    }
};
exports.getBillingById = getBillingById;
// Update billing payment status
const updateBillingPaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        const billing = await client_1.prisma.billing.findUnique({
            where: { id },
            include: {
                shop: true,
            },
        });
        if (!billing) {
            res.status(404).json({ error: "Billing not found" });
            return;
        }
        // Check if user manages this shop by querying directly
        const managedShop = await client_1.prisma.shop.findFirst({
            where: {
                id: billing.shopId,
                managerId: user.publicId
            },
        });
        const userShopId = managedShop?.id;
        if (!user.role || (!(0, roles_1.isAdmin)(user.role) && billing.shopId !== userShopId)) {
            res.status(403).json({ error: "Access denied to this billing" });
            return;
        }
        if (!["pending", "paid", "failed"].includes(paymentStatus)) {
            res.status(400).json({ error: "Invalid payment status" });
            return;
        }
        const updatedBilling = await client_1.prisma.billing.update({
            where: { id },
            data: {
                paymentStatus,
                updatedAt: new Date(),
            },
            include: {
                shop: true,
            },
        });
        res.status(200).json(updatedBilling);
    }
    catch (error) {
        logger_1.logger.error("Error updating billing payment status:", error);
        res.status(500).json({ error: "Failed to update billing payment status" });
    }
};
exports.updateBillingPaymentStatus = updateBillingPaymentStatus;
// Get billing statistics for a shop
const getBillingStats = async (req, res) => {
    try {
        const { shopId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        // Check if user manages this shop by querying directly
        const managedShop = await client_1.prisma.shop.findFirst({
            where: {
                id: shopId,
                managerId: user.publicId
            },
        });
        const userShopId = managedShop?.id;
        if (!user.role || (!(0, roles_1.isAdmin)(user.role) && shopId !== userShopId)) {
            res.status(403).json({ error: "Access denied to this shop" });
            return;
        }
        // Get billing statistics
        const stats = await client_1.prisma.billing.groupBy({
            by: ['paymentStatus'],
            where: { shopId },
            _count: { id: true },
            _sum: { total: true },
        });
        // Get total counts
        const totalBillings = await client_1.prisma.billing.count({
            where: { shopId },
        });
        const totalRevenue = await client_1.prisma.billing.aggregate({
            where: {
                shopId,
                paymentStatus: "paid",
            },
            _sum: { total: true },
        });
        const result = {
            totalBillings,
            totalRevenue: totalRevenue._sum.total || 0,
            byStatus: stats.reduce((acc, stat) => {
                acc[stat.paymentStatus] = {
                    count: stat._count.id,
                    total: stat._sum.total || 0,
                };
                return acc;
            }, {}),
        };
        res.status(200).json(result);
    }
    catch (error) {
        logger_1.logger.error("Error fetching billing stats:", error);
        res.status(500).json({ error: "Failed to fetch billing stats" });
    }
};
exports.getBillingStats = getBillingStats;

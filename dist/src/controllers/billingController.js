"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingStats = exports.updateBillingPaymentStatus = exports.getBillingById = exports.getBillings = exports.getNextInvoiceNumber = exports.createBilling = void 0;
const client_1 = require("../config/client");
const logger_1 = require("../utils/logger");
const roles_1 = require("../config/roles");
const NotificationsController_1 = require("./NotificationsController");
const socketService_1 = require("../services/socketService");
const audit_1 = require("../utils/audit");
// Create billing
const createBilling = async (req, res) => {
    try {
        const { shopId, invoiceNumber, customerName, customerEmail, customerContact, items, subtotal, tax = 0, discount = 0, total, invoiceType = "SHOP", // SHOP | FACTORY
         } = req.body;
        const userId = req.user?.publicId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        // Check if user has access to this shop
        const user = await client_1.prisma.user.findUnique({
            where: { publicId: userId },
        });
        if (!user) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        let shop = null;
        // Handle different invoice types
        if (invoiceType === "FACTORY") {
            // Factory invoices don't require shop validation
            if (!(0, roles_1.isAdmin)(user.role || "")) {
                res.status(403).json({ error: "Only admins can create factory invoices" });
                return;
            }
        }
        else {
            // Shop invoices require shop validation
            if (!shopId) {
                res.status(400).json({ error: "Shop ID is required for shop invoices" });
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
            shop = await client_1.prisma.shop.findUnique({
                where: { id: shopId },
            });
            if (!shop) {
                res.status(404).json({ error: "Shop not found" });
                return;
            }
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
            // For factory invoices, skip shop inventory validation
            if (invoiceType === "FACTORY") {
                // Calculate item total
                const itemTotal = quantity * unitPrice;
                validatedItems.push({
                    ...item,
                    productName: item.productName || product.name,
                    total: itemTotal,
                });
            }
            else {
                // For shop invoices, validate shop inventory
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
                    productName: item.productName || product.name,
                    total: itemTotal,
                });
                // Prepare stock update for shop invoices
                stockUpdates.push({
                    inventoryId: shopInventory.id,
                    newStock: shopInventory.currentStock - quantity,
                });
            }
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
            shopId: invoiceType === "FACTORY" ? null : shopId,
            customerName,
            customerEmail,
            customerContact,
            items: validatedItems,
            subtotal,
            tax,
            discount,
            total,
            paymentStatus: "pending",
            invoiceType,
        };
        // Create billing with proper fields
        const billing = await client_1.prisma.billing.create({
            data: {
                ...baseData,
                invoiceNumber: nextInvoiceNumber || null,
                createdBy: user.publicId,
                createdByRole: user.role || null,
            },
            include: { shop: true },
        });
        // Update stock levels only for shop invoices
        if (invoiceType === "SHOP") {
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
                        const notificationMessage = `🚨 Low stock alert after sale: ${product.name} in ${shop?.name || 'Unknown Shop'} has only ${shopInventory.currentStock} units remaining (min: ${product.minStockLevel})`;
                        // Notify shop manager
                        if (shop?.managerId) {
                            await client_1.prisma.notification.create({
                                data: {
                                    userId: shop.managerId,
                                    type: "LOW_STOCK_ALERT",
                                    category: "INVENTORY",
                                    priority: "HIGH",
                                    message: notificationMessage,
                                    metadata: JSON.stringify({
                                        productId: item.productId,
                                        productName: product.name,
                                        currentStock: shopInventory.currentStock,
                                        minStockLevel: product.minStockLevel,
                                        shopId: shop.id,
                                        shopName: shop.name
                                    })
                                },
                            });
                            (0, NotificationsController_1.emitUserNotification)(shop.managerId, {
                                event: "created",
                                notification: {
                                    type: "LOW_STOCK_ALERT",
                                    category: "INVENTORY",
                                    priority: "HIGH",
                                    message: notificationMessage,
                                },
                            });
                        }
                    }
                }
            }
        }
        // Create appropriate notifications based on invoice type
        if (invoiceType === "FACTORY") {
            // Factory invoice notification - notify all admins
            const adminUsers = await client_1.prisma.user.findMany({
                where: { role: "Admin" },
                select: { publicId: true, name: true }
            });
            const factoryMessage = `🏭 Factory invoice created: ${customerName || 'Customer'} - Total: ₹${total} (Created by ${user.name || user.email})`;
            for (const admin of adminUsers) {
                await client_1.prisma.notification.create({
                    data: {
                        userId: admin.publicId,
                        type: "FACTORY_INVOICE_CREATED",
                        category: "FACTORY",
                        priority: "MEDIUM",
                        message: factoryMessage,
                        metadata: JSON.stringify({
                            invoiceId: billing.id,
                            invoiceNumber: billing.invoiceNumber,
                            createdBy: user.publicId,
                            createdByName: user.name || user.email,
                            total: total,
                            customerName: customerName || 'Customer'
                        })
                    },
                });
                (0, NotificationsController_1.emitUserNotification)(admin.publicId, {
                    event: "created",
                    notification: {
                        type: "FACTORY_INVOICE_CREATED",
                        category: "FACTORY",
                        priority: "MEDIUM",
                        message: factoryMessage,
                    },
                });
            }
        }
        else {
            // Shop invoice notification
            const shopMessage = `🧾 Invoice generated for ${shop?.name || 'Unknown Shop'}: ${customerName || 'Customer'} - Total: ₹${total}${(0, roles_1.isAdmin)(user.role || "") ? ` (Created by Admin: ${user.name || user.email})` : ''}`;
            if (shop?.managerId) {
                await client_1.prisma.notification.create({
                    data: {
                        userId: shop.managerId,
                        type: "SHOP_INVOICE_CREATED",
                        category: "BILLING",
                        priority: "MEDIUM",
                        message: shopMessage,
                        metadata: JSON.stringify({
                            invoiceId: billing.id,
                            invoiceNumber: billing.invoiceNumber,
                            shopId: shop.id,
                            shopName: shop.name,
                            createdBy: user.publicId,
                            createdByName: user.name || user.email,
                            createdByRole: user.role,
                            total: total,
                            customerName: customerName || 'Customer'
                        })
                    },
                });
                (0, NotificationsController_1.emitUserNotification)(shop.managerId, {
                    event: "created",
                    notification: {
                        type: "SHOP_INVOICE_CREATED",
                        category: "BILLING",
                        priority: "MEDIUM",
                        message: shopMessage,
                    },
                });
            }
        }
        // Audit
        await (0, audit_1.logActivity)({
            type: "billing",
            action: "created",
            entity: "Billing",
            entityId: billing.id,
            userId: req.user?.publicId,
            shopId,
            metadata: { total }
        });
        // Broadcast real-time update
        const socketService = (0, socketService_1.getSocketService)();
        socketService.broadcastBillingUpdate(shopId, {
            type: 'created',
            billing: billing,
            timestamp: new Date().toISOString()
        });
        // Emit revenue update for admin dashboard (only for shop invoices)
        if (invoiceType === "SHOP") {
            socketService.emitToAll('revenue_updated', {
                event: 'revenue_updated',
                data: {
                    total: billing.total,
                    shopId: billing.shopId,
                    shopName: shop?.name || 'Unknown Shop',
                    invoiceNumber: billing.invoiceNumber,
                    timestamp: new Date().toISOString()
                }
            });
        }
        res.status(201).json(billing);
    }
    catch (error) {
        logger_1.logger.error("Error creating billing:", error);
        res.status(500).json({ error: "Failed to create billing" });
    }
};
exports.createBilling = createBilling;
// Get next invoice number
const getNextInvoiceNumber = async (req, res) => {
    try {
        const userId = req.user?.publicId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const year = new Date().getFullYear();
        const prefix = `BLIZZ/${year}`;
        try {
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
            const nextInvoiceNumber = `${prefix}/${nextSeq}`;
            res.json({ invoiceNumber: nextInvoiceNumber });
            return;
        }
        catch (e) {
            res.json({ invoiceNumber: `${prefix}/00001` });
            return;
        }
    }
    catch (error) {
        logger_1.logger.error("Error computing next invoice number:", error);
        res.status(500).json({ error: "Failed to compute next invoice number" });
    }
};
exports.getNextInvoiceNumber = getNextInvoiceNumber;
// Get billings by shop ID
const getBillings = async (req, res) => {
    try {
        const { shopId } = req.params;
        const userId = req.user?.publicId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const user = await client_1.prisma.user.findUnique({
            where: { publicId: userId },
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
        const userId = req.user?.publicId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const user = await client_1.prisma.user.findUnique({
            where: { publicId: userId },
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
        let managedShop = null;
        if (billing.shopId) {
            managedShop = await client_1.prisma.shop.findFirst({
                where: {
                    id: billing.shopId,
                    managerId: user.publicId
                },
            });
        }
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
        const userId = req.user?.publicId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const user = await client_1.prisma.user.findUnique({
            where: { publicId: userId },
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
        let managedShop = null;
        if (billing.shopId) {
            managedShop = await client_1.prisma.shop.findFirst({
                where: {
                    id: billing.shopId,
                    managerId: user.publicId
                },
            });
        }
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
        const userId = req.user?.publicId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const user = await client_1.prisma.user.findUnique({
            where: { publicId: userId },
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

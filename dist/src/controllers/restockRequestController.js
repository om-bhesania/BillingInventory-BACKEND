"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.softDeleteRestockRequest = exports.autoGenerateRestockRequest = exports.markRestockRequestFulfilled = exports.updateRestockRequestStatus = exports.rejectRestockRequest = exports.approveRestockRequest = exports.getAllRestockRequests = exports.getRestockRequests = exports.createRestockRequest = void 0;
const client_1 = require("../config/client");
const logger_1 = require("../utils/logger");
const roles_1 = require("../config/roles");
const NotificationsController_1 = require("./NotificationsController");
const console_log_colors_1 = require("console-log-colors");
const audit_1 = require("../utils/audit");
// Create restock request
const createRestockRequest = async (req, res) => {
    try {
        const { shopId, productId, requestedAmount, notes } = req.body;
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
        console.log((0, console_log_colors_1.bgRedBright)(user.role), 'user.role');
        // Allow Admin role or Shop_Owner role managing the specific shop
        if (!user.role || (!(0, roles_1.isAdmin)(user.role) && !(0, roles_1.isShopOwner)(user.role))) {
            res.status(403).json({ error: "Access denied: Admin or Shop Owner role required" });
            return;
        }
        // If user is Shop_Owner, they can only create requests for shops they manage
        if ((0, roles_1.isShopOwner)(user.role) && shopId !== userShopId) {
            res.status(403).json({ error: "Shop Owner can only create restock requests for their own shop" });
            return;
        }
        // Check if product exists
        const product = await client_1.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            res.status(404).json({ error: "Product not found" });
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
        // Create restock request
        const restockRequest = await client_1.prisma.restockRequest.create({
            data: {
                shopId,
                productId,
                requestedAmount,
                notes,
                status: "pending",
            },
            include: {
                shop: true,
                product: true,
            },
        });
        // Create notification message
        const notificationMessage = `Restock request: ${requestedAmount} units of ${product.name} requested for ${shop.name}`;
        // Notify shop owner/manager
        if (shop.managerId) {
            await client_1.prisma.notification.create({
                data: {
                    userId: shop.managerId,
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
            // Emit real-time notification
            (0, NotificationsController_1.emitUserNotification)(shop.managerId, {
                event: "created",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
        }
        // Notify all Admin users about the restock request
        const adminUsers = await client_1.prisma.user.findMany({
            where: {
                role: "Admin"
            },
            select: {
                publicId: true
            }
        });
        for (const adminUser of adminUsers) {
            const adminNotificationMessage = `New restock request from ${shop.name}: ${requestedAmount} units of ${product.name} requested by ${user.name || user.email}`;
            await client_1.prisma.notification.create({
                data: {
                    userId: adminUser.publicId,
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
            // Emit real-time notification to admin
            (0, NotificationsController_1.emitUserNotification)(adminUser.publicId, {
                event: "created",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
        }
        // Audit
        await (0, audit_1.logActivity)({
            type: "restock",
            action: "created",
            entity: "RestockRequest",
            entityId: restockRequest.id,
            userId: req.user?.publicId,
            shopId: shopId,
            meta: { requestedAmount, productId }
        });
        res.status(201).json(restockRequest);
    }
    catch (error) {
        logger_1.logger.error("Error creating restock request:", error);
        res.status(500).json({ error: "Failed to create restock request" });
    }
};
exports.createRestockRequest = createRestockRequest;
// Get restock requests by shop ID
const getRestockRequests = async (req, res) => {
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
        // Allow Admin role or Shop_Owner role managing the specific shop
        if (!user.role || (!(0, roles_1.isAdmin)(user.role) && !(0, roles_1.isShopOwner)(user.role))) {
            res.status(403).json({ error: "Access denied: Admin or Shop Owner role required" });
            return;
        }
        // If user is Shop_Owner, they can only view requests for shops they manage
        if ((0, roles_1.isShopOwner)(user.role) && shopId !== userShopId) {
            res.status(403).json({ error: "Shop Owner can only view restock requests for their own shop" });
            return;
        }
        const restockRequests = await client_1.prisma.restockRequest.findMany({
            where: { shopId },
            include: {
                product: {
                    include: {
                        category: true,
                        flavor: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(restockRequests);
    }
    catch (error) {
        logger_1.logger.error("Error fetching restock requests:", error);
        res.status(500).json({ error: "Failed to fetch restock requests" });
    }
};
exports.getRestockRequests = getRestockRequests;
// Get all restock requests across all shops (Admin only)
const getAllRestockRequests = async (req, res) => {
    try {
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
        // Only Admin role can view all restock requests
        if (!user.role || !(0, roles_1.isAdmin)(user.role)) {
            res.status(403).json({ error: "Access denied: Admin role required" });
            return;
        }
        const restockRequests = await client_1.prisma.restockRequest.findMany({
            where: {
                // @ts-ignore
                hidden: false, // Only show non-hidden requests
            },
            include: {
                shop: true,
                product: {
                    include: {
                        category: true,
                        flavor: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(restockRequests);
    }
    catch (error) {
        logger_1.logger.error("Error fetching all restock requests:", error);
        res.status(500).json({ error: "Failed to fetch all restock requests" });
    }
};
exports.getAllRestockRequests = getAllRestockRequests;
// Approve restock request
const approveRestockRequest = async (req, res) => {
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
        // Get restock request
        const restockRequest = await client_1.prisma.restockRequest.findUnique({
            where: { id },
            include: {
                shop: true,
                product: true,
            },
        });
        if (!restockRequest) {
            res.status(404).json({ error: "Restock request not found" });
            return;
        }
        // Check if user manages this shop by querying directly
        const managedShop = await client_1.prisma.shop.findFirst({
            where: {
                id: restockRequest.shopId,
                managerId: user.publicId
            },
        });
        const userShopId = managedShop?.id;
        if (!user.role || (!(0, roles_1.isAdmin)(user.role) && restockRequest.shopId !== userShopId)) {
            res.status(403).json({ error: "Access denied to this shop" });
        }
        if (restockRequest.status !== "pending") {
            res.status(400).json({ error: "Restock request is not pending" });
            return;
        }
        // Approve request and move to in_transit (don't increment shop stock yet)
        const updatedRequest = await client_1.prisma.restockRequest.update({
            where: { id },
            data: {
                status: "in_transit",
                updatedAt: new Date(),
            },
        });
        // Decrement factory-level stock now (product.totalStock)
        const product = await client_1.prisma.product.findUnique({ where: { id: restockRequest.productId } });
        if (!product) {
            res.status(404).json({ error: "Product not found" });
            return;
        }
        if (product.totalStock < restockRequest.requestedAmount) {
            res.status(400).json({ error: `Insufficient factory stock for ${product.name}. Available: ${product.totalStock}, Requested: ${restockRequest.requestedAmount}` });
            return;
        }
        await client_1.prisma.product.update({
            where: { id: product.id },
            data: {
                totalStock: {
                    decrement: restockRequest.requestedAmount,
                },
                updatedAt: new Date(),
            },
        });
        // Notify the user who created the request
        const notificationMessage = `Restock request approved: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} added to ${restockRequest.shop.name}`;
        // Find the user who created the request (this would need to be tracked in the schema)
        // For now, we'll notify shop owner and manager
        if (restockRequest.shop.managerId) {
            await client_1.prisma.notification.create({
                data: {
                    userId: restockRequest.shop.managerId,
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
        }
        if (restockRequest.shop.managerId && restockRequest.shop.managerId !== restockRequest.shop.managerId) {
            await client_1.prisma.notification.create({
                data: {
                    userId: restockRequest.shop.managerId,
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
        }
        // Notify all Admin users about the approved restock request
        const adminUsers = await client_1.prisma.user.findMany({
            where: {
                role: "Admin"
            },
            select: {
                publicId: true
            }
        });
        for (const adminUser of adminUsers) {
            const adminNotificationMessage = `Restock request approved: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} added to ${restockRequest.shop.name} by ${user.name || user.email}`;
            await client_1.prisma.notification.create({
                data: {
                    userId: adminUser.publicId,
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
            // Emit real-time notification to admin
            (0, NotificationsController_1.emitUserNotification)(adminUser.publicId, {
                event: "approved",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
        }
        res.status(200).json(updatedRequest);
        // Audit
        await (0, audit_1.logActivity)({
            type: "restock",
            action: "status_changed",
            entity: "RestockRequest",
            entityId: updatedRequest.id,
            userId: req.user?.publicId,
            shopId: restockRequest.shopId,
            meta: { status: updatedRequest.status }
        });
    }
    catch (error) {
        logger_1.logger.error("Error approving restock request:", error);
        res.status(500).json({ error: "Failed to approve restock request" });
    }
};
exports.approveRestockRequest = approveRestockRequest;
// Reject restock request
const rejectRestockRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
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
        // Get restock request
        const restockRequest = await client_1.prisma.restockRequest.findUnique({
            where: { id },
            include: {
                shop: true,
                product: true,
            },
        });
        if (!restockRequest) {
            res.status(404).json({ error: "Restock request not found" });
            return;
        }
        // Check if user manages this shop by querying directly
        const managedShop = await client_1.prisma.shop.findFirst({
            where: {
                id: restockRequest.shopId,
                managerId: user.publicId
            },
        });
        const userShopId = managedShop?.id;
        if (!user.role || (!(0, roles_1.isAdmin)(user.role) && restockRequest.shopId !== userShopId)) {
            res.status(403).json({ error: "Access denied to this shop" });
        }
        if (restockRequest.status !== "pending") {
            res.status(400).json({ error: "Restock request is not pending" });
            return;
        }
        // Update restock request status
        const updatedRequest = await client_1.prisma.restockRequest.update({
            where: { id },
            data: {
                status: "rejected",
                notes: notes || restockRequest.notes,
                updatedAt: new Date(),
            },
        });
        // Notify the user who created the request
        const notificationMessage = `Restock request rejected: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name}. Reason: ${notes || "No reason provided"}`;
        // Notify shop owner/manager
        if (restockRequest.shop.managerId) {
            await client_1.prisma.notification.create({
                data: {
                    userId: restockRequest.shop.managerId,
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
            // Emit real-time notification
            (0, NotificationsController_1.emitUserNotification)(restockRequest.shop.managerId, {
                event: "rejected",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
        }
        // Notify all Admin users about the rejected restock request
        const adminUsers = await client_1.prisma.user.findMany({
            where: {
                role: "Admin"
            },
            select: {
                publicId: true
            }
        });
        for (const adminUser of adminUsers) {
            const adminNotificationMessage = `Restock request rejected: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name} by ${user.name || user.email}. Reason: ${notes || "No reason provided"}`;
            await client_1.prisma.notification.create({
                data: {
                    userId: adminUser.publicId,
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
            // Emit real-time notification to admin
            (0, NotificationsController_1.emitUserNotification)(adminUser.publicId, {
                event: "rejected",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
        }
        res.status(200).json(updatedRequest);
    }
    catch (error) {
        logger_1.logger.error("Error rejecting restock request:", error);
        res.status(500).json({ error: "Failed to reject restock request" });
    }
};
exports.rejectRestockRequest = rejectRestockRequest;
// Update restock request status
const updateRestockRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
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
        // Only Admin role can update restock request status
        if (!user.role || !(0, roles_1.isAdmin)(user.role)) {
            res.status(403).json({ error: "Access denied: Admin role required" });
            return;
        }
        // Get restock request
        const restockRequest = await client_1.prisma.restockRequest.findUnique({
            where: { id },
            include: {
                shop: true,
                product: true,
            },
        });
        if (!restockRequest) {
            res.status(404).json({ error: "Restock request not found" });
            return;
        }
        // Validate status transition
        const validStatuses = ["pending", "accepted", "in_transit", "fulfilled", "rejected"];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: "Invalid status. Must be one of: pending, accepted, in_transit, fulfilled, rejected" });
            return;
        }
        // Update restock request status
        const updatedRequest = await client_1.prisma.restockRequest.update({
            where: { id },
            data: {
                status,
                notes: notes || restockRequest.notes,
                updatedAt: new Date(),
            },
        });
        // If fulfilled via admin/status route, increment shop inventory just like markRestockRequestFulfilled
        if (status === "fulfilled") {
            const currentInventory = await client_1.prisma.shopInventory.findFirst({
                where: {
                    shopId: restockRequest.shopId,
                    productId: restockRequest.productId,
                    isActive: true,
                },
            });
            if (currentInventory) {
                await client_1.prisma.shopInventory.update({
                    where: { id: currentInventory.id },
                    data: {
                        currentStock: currentInventory.currentStock + restockRequest.requestedAmount,
                        lastRestockDate: new Date(),
                        updatedAt: new Date(),
                    },
                });
            }
            else {
                await client_1.prisma.shopInventory.create({
                    data: {
                        shopId: restockRequest.shopId,
                        productId: restockRequest.productId,
                        currentStock: restockRequest.requestedAmount,
                        lastRestockDate: new Date(),
                    },
                });
            }
        }
        // Audit
        await (0, audit_1.logActivity)({
            type: "restock",
            action: "status_changed",
            entity: "RestockRequest",
            entityId: updatedRequest.id,
            userId: req.user?.publicId,
            shopId: restockRequest.shopId,
            meta: { productId: restockRequest.productId, requestedAmount: restockRequest.requestedAmount, status }
        });
        // Create notification message
        const statusMessages = {
            accepted: `Restock request accepted: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name}`,
            in_transit: `Restock request in transit: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name}`,
            fulfilled: `Restock request fulfilled: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name}`,
            rejected: `Restock request rejected: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name}. Reason: ${notes || "No reason provided"}`
        };
        const notificationMessage = statusMessages[status] || `Restock request status updated to ${status}`;
        // Notify shop owner/manager
        if (restockRequest.shop.managerId) {
            await client_1.prisma.notification.create({
                data: {
                    userId: restockRequest.shop.managerId,
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
            // Emit real-time notification
            (0, NotificationsController_1.emitUserNotification)(restockRequest.shop.managerId, {
                event: "status_updated",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
        }
        // Notify all Admin users about the status update
        const adminUsers = await client_1.prisma.user.findMany({
            where: {
                role: "Admin"
            },
            select: {
                publicId: true
            }
        });
        for (const adminUser of adminUsers) {
            const adminNotificationMessage = `Restock request status updated: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} for ${restockRequest.shop.name} - Status: ${status} by ${user.name || user.email}`;
            await client_1.prisma.notification.create({
                data: {
                    userId: adminUser.publicId,
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
            // Emit real-time notification to admin
            (0, NotificationsController_1.emitUserNotification)(adminUser.publicId, {
                event: "status_updated",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
        }
        res.status(200).json(updatedRequest);
    }
    catch (error) {
        logger_1.logger.error("Error updating restock request status:", error);
        res.status(500).json({ error: "Failed to update restock request status" });
    }
};
exports.updateRestockRequestStatus = updateRestockRequestStatus;
// Mark restock request as fulfilled (called from shop inventory when order is received)
const markRestockRequestFulfilled = async (req, res) => {
    try {
        const { shopId, productId } = req.body;
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
        // Check if user manages this shop
        const managedShop = await client_1.prisma.shop.findFirst({
            where: {
                id: shopId,
                managerId: user.publicId
            },
        });
        // Allow Admin role or Shop Owner role managing the specific shop
        if (!user.role || (!(0, roles_1.isAdmin)(user.role) && !(0, roles_1.isShopOwner)(user.role))) {
            res.status(403).json({ error: "Access denied: Admin or Shop Owner role required" });
            return;
        }
        // If user is Shop Owner, they can only mark requests for shops they manage
        if ((0, roles_1.isShopOwner)(user.role) && !managedShop) {
            res.status(403).json({ error: "Shop Owner can only mark restock requests as fulfilled for their own shops" });
            return;
        }
        // Find the most recent pending restock request for this product and shop
        const restockRequest = await client_1.prisma.restockRequest.findFirst({
            where: {
                shopId,
                productId,
                status: { in: ["pending", "accepted", "in_transit"] }
            },
            orderBy: { createdAt: "desc" },
            include: {
                shop: true,
                product: true,
            },
        });
        if (!restockRequest) {
            res.status(404).json({ error: "No pending restock request found for this product and shop" });
            return;
        }
        // Update restock request status to fulfilled
        const updatedRequest = await client_1.prisma.restockRequest.update({
            where: { id: restockRequest.id },
            data: {
                status: "fulfilled",
                updatedAt: new Date(),
            },
        });
        // Increment shop inventory on fulfillment
        const currentInventory = await client_1.prisma.shopInventory.findFirst({
            where: {
                shopId,
                productId,
                isActive: true,
            },
        });
        if (currentInventory) {
            await client_1.prisma.shopInventory.update({
                where: { id: currentInventory.id },
                data: {
                    currentStock: currentInventory.currentStock + restockRequest.requestedAmount,
                    lastRestockDate: new Date(),
                    updatedAt: new Date(),
                },
            });
        }
        else {
            await client_1.prisma.shopInventory.create({
                data: {
                    shopId,
                    productId,
                    currentStock: restockRequest.requestedAmount,
                    lastRestockDate: new Date(),
                },
            });
        }
        // Create notification message
        const notificationMessage = `Restock request fulfilled: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} received for ${restockRequest.shop.name}`;
        // Notify shop owner/manager
        if (restockRequest.shop.managerId) {
            await client_1.prisma.notification.create({
                data: {
                    userId: restockRequest.shop.managerId,
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
            // Emit real-time notification
            (0, NotificationsController_1.emitUserNotification)(restockRequest.shop.managerId, {
                event: "fulfilled",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
        }
        // Notify all Admin users
        const adminUsers = await client_1.prisma.user.findMany({
            where: {
                role: "Admin"
            },
            select: {
                publicId: true
            }
        });
        for (const adminUser of adminUsers) {
            const adminNotificationMessage = `Restock request fulfilled: ${restockRequest.requestedAmount} units of ${restockRequest.product.name} received for ${restockRequest.shop.name} by ${user.name || user.email}`;
            await client_1.prisma.notification.create({
                data: {
                    userId: adminUser.publicId,
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
            // Emit real-time notification to admin
            (0, NotificationsController_1.emitUserNotification)(adminUser.publicId, {
                event: "fulfilled",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
        }
        res.status(200).json(updatedRequest);
    }
    catch (error) {
        logger_1.logger.error("Error marking restock request as fulfilled:", error);
        res.status(500).json({ error: "Failed to mark restock request as fulfilled" });
    }
};
exports.markRestockRequestFulfilled = markRestockRequestFulfilled;
// Auto-generate restock request when stock is low
const autoGenerateRestockRequest = async (shopId, productId, currentStock) => {
    try {
        const product = await client_1.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product || !product.minStockLevel || currentStock > product.minStockLevel) {
            return null;
        }
        // Check if there's already a pending request
        const existingRequest = await client_1.prisma.restockRequest.findFirst({
            where: {
                shopId,
                productId,
                status: "pending",
            },
        });
        if (existingRequest) {
            return existingRequest;
        }
        // Create auto restock request
        const restockRequest = await client_1.prisma.restockRequest.create({
            data: {
                shopId,
                productId,
                requestedAmount: product.minStockLevel * 2, // Request 2x min stock level
                notes: "Auto-generated due to low stock",
                status: "pending",
            },
        });
        logger_1.logger.info(`Auto-generated restock request for product ${productId} in shop ${shopId}`);
        // Trigger notification
        const shop = await client_1.prisma.shop.findUnique({
            where: { id: shopId },
        });
        if (shop?.managerId) {
            const notificationMessage = `Auto restock request: ${restockRequest.requestedAmount} units of ${product.name} requested for ${shop.name} due to low stock (${currentStock}/${product.minStockLevel})`;
            await client_1.prisma.notification.create({
                data: {
                    userId: shop.managerId,
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
            // Emit real-time notification
            (0, NotificationsController_1.emitUserNotification)(shop.managerId, {
                event: "auto_generated",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
        }
        // Notify all Admin users about the auto-generated restock request
        const adminUsers = await client_1.prisma.user.findMany({
            where: {
                role: "Admin"
            },
            select: {
                publicId: true
            }
        });
        for (const adminUser of adminUsers) {
            const adminNotificationMessage = `Auto restock request generated: ${restockRequest.requestedAmount} units of ${product.name} requested for ${shop?.name || 'Unknown Shop'} due to low stock (${currentStock}/${product.minStockLevel})`;
            await client_1.prisma.notification.create({
                data: {
                    userId: adminUser.publicId,
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
            // Emit real-time notification to admin
            (0, NotificationsController_1.emitUserNotification)(adminUser.publicId, {
                event: "auto_generated",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: adminNotificationMessage,
                },
            });
        }
        return restockRequest;
    }
    catch (error) {
        logger_1.logger.error("Error auto-generating restock request:", error);
        return null;
    }
};
exports.autoGenerateRestockRequest = autoGenerateRestockRequest;
// Soft delete restock request (Admin only) - hide from UI but keep in DB
const softDeleteRestockRequest = async (req, res) => {
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
        // Only Admin role can soft delete restock requests
        if (!user.role || !(0, roles_1.isAdmin)(user.role)) {
            res.status(403).json({ error: "Access denied: Admin role required" });
            return;
        }
        // Get the request with shop and product details before hiding
        const existingRequest = await client_1.prisma.restockRequest.findUnique({
            where: { id },
            include: {
                shop: true,
                product: true,
            },
        });
        if (!existingRequest) {
            res.status(404).json({ error: "Restock request not found" });
            return;
        }
        // Soft delete by setting hidden to true
        const deletedRequest = await client_1.prisma.restockRequest.update({
            where: { id },
            data: {
                // @ts-ignore
                hidden: true,
            },
            include: {
                shop: true,
                product: true,
            },
        });
        // Create notification for shop owner/manager
        if (existingRequest.shop.managerId) {
            const notificationMessage = `Restock request hidden: ${existingRequest.requestedAmount} units of ${existingRequest.product.name} for ${existingRequest.shop.name}`;
            await client_1.prisma.notification.create({
                data: {
                    userId: existingRequest.shop.managerId,
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
            // Emit real-time notification
            (0, NotificationsController_1.emitUserNotification)(existingRequest.shop.managerId, {
                event: "hidden",
                notification: {
                    type: "RESTOCK_REQUEST",
                    message: notificationMessage,
                },
            });
        }
        res.status(200).json({
            message: "Restock request hidden successfully",
            request: deletedRequest
        });
    }
    catch (error) {
        logger_1.logger.error("Error hiding restock request:", error);
        res.status(500).json({ error: "Failed to hide restock request" });
    }
};
exports.softDeleteRestockRequest = softDeleteRestockRequest;

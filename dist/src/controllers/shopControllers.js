"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllShopData = exports.unlinkShopManager = exports.linkShopManager = exports.forceDeleteShop = exports.deleteShop = exports.updateShop = exports.getShopById = exports.getAllShops = exports.unlinkShopFromUser = exports.linkShopToUser = exports.createShop = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../config/client");
const logger_1 = require("../utils/logger");
const roles_1 = require("../config/roles");
const shopIdManager_1 = require("../utils/shopIdManager");
const audit_1 = require("../utils/audit");
const prisma = client_2.prisma ?? new client_1.PrismaClient();
// Create a new shop
const createShop = async (req, res) => {
    try {
        const { name, description, address, contactNumber, email, operatingHours, managerId, // Now using publicId
         } = req.body;
        // Validate required fields
        if (!name || !address || !contactNumber || !email || !operatingHours || !managerId) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ["name", "address", "contactNumber", "email", "operatingHours", "managerId"],
            });
        }
        // Validate and clean shop name
        const trimmedName = name.trim();
        if (!trimmedName || trimmedName.length < 2) {
            return res.status(400).json({
                error: "Shop name must be at least 2 characters long",
                field: "name"
            });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: "Please provide a valid email address",
                field: "email"
            });
        }
        // Validate contact number (basic validation)
        const contactRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        if (!contactRegex.test(contactNumber)) {
            return res.status(400).json({
                error: "Please provide a valid contact number (at least 10 digits)",
                field: "contactNumber"
            });
        }
        // Check if manager exists - managerId is now required
        const manager = await prisma.user.findUnique({
            where: { publicId: managerId },
        });
        if (!manager) {
            return res.status(404).json({ error: "Manager not found" });
        }
        // Check if a shop with the same name already exists
        const existingShop = await prisma.shop.findFirst({
            where: { name: trimmedName },
        });
        if (existingShop) {
            return res.status(409).json({
                error: "Shop with this name already exists",
                existingShop: {
                    id: existingShop.id,
                    name: existingShop.name,
                    address: existingShop.address
                }
            });
        }
        const shop = await prisma.shop.create({
            data: {
                name: trimmedName,
                description,
                address,
                contactNumber,
                email,
                operatingHours,
                managerId, // Using publicId
            },
            include: {
                manager: {
                    select: {
                        publicId: true,
                        name: true,
                        email: true,
                        contact: true,
                    },
                },
            },
        });
        // Automatically add shop ID to user's shopIds array (managerId is now required)
        try {
            await (0, shopIdManager_1.addShopIdToUser)(managerId, shop.id);
            logger_1.logger.info(`Added shop ID ${shop.id} to user ${managerId}'s shopIds array`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to add shop ID to user's shopIds array:`, error);
            // Don't fail the shop creation if this fails
        }
        logger_1.logger.business.shopCreated(shop.name, shop.managerId || '');
        await (0, audit_1.logActivity)({
            type: "shop",
            action: "created",
            entity: "Shop",
            entityId: shop.id,
            userId: req.user?.publicId,
            shopId: shop.id,
            metadata: { name }
        });
        return res.status(201).json(shop);
    }
    catch (error) {
        logger_1.logger.error("Error creating shop:", error);
        // Handle specific Prisma errors
        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0];
            if (field === 'name') {
                return res.status(409).json({
                    error: "Shop with this name already exists. Please choose a different name.",
                    field: 'name'
                });
            }
            return res.status(409).json({
                error: `A shop with this ${field} already exists.`,
                field: field
            });
        }
        // Handle other Prisma errors
        if (error.code && error.code.startsWith('P')) {
            return res.status(400).json({
                error: "Invalid data provided. Please check your input.",
                details: error.message
            });
        }
        console.log(error);
        return res.status(500).json({ error: "Failed to create shop. Please try again later." });
    }
};
exports.createShop = createShop;
// Link a shop to a user as manager
const linkShopToUser = async (req, res) => {
    try {
        const { shopId, userPublicId, role } = req.body;
        if (!shopId || !userPublicId || !role) {
            return res
                .status(400)
                .json({ error: "shopId, userPublicId and role are required" });
        }
        const user = await prisma.user.findUnique({ where: { publicId: userPublicId } });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop)
            return res.status(404).json({ error: "Shop not found" });
        // Get shops that this user was previously managing to remove from their shopIds
        const previousShops = await prisma.shop.findMany({
            where: { managerId: userPublicId },
            select: { id: true }
        });
        // Clear any previous management assignments for this user
        await prisma.shop.updateMany({
            where: { managerId: userPublicId },
            data: { managerId: null },
        });
        // Remove previous shop IDs from user's shopIds array
        for (const shop of previousShops) {
            try {
                await (0, shopIdManager_1.removeShopIdFromUser)(userPublicId, shop.id);
            }
            catch (error) {
                logger_1.logger.error(`Failed to remove shop ID ${shop.id} from user ${userPublicId}'s shopIds array:`, error);
            }
        }
        const updated = await prisma.shop.update({
            where: { id: shopId },
            data: { managerId: userPublicId },
            include: { manager: true },
        });
        // Add new shop ID to user's shopIds array
        try {
            await (0, shopIdManager_1.addShopIdToUser)(userPublicId, shopId);
            logger_1.logger.info(`Added shop ID ${shopId} to user ${userPublicId}'s shopIds array`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to add shop ID to user's shopIds array:`, error);
        }
        return res.json(updated);
    }
    catch (error) {
        console.error("Error linking shop to user:", error);
        return res.status(500).json({ error: "Failed to link shop to user" });
    }
};
exports.linkShopToUser = linkShopToUser;
// Unlink a shop from a user (manager)
const unlinkShopFromUser = async (req, res) => {
    try {
        const { shopId } = req.body;
        if (!shopId) {
            return res.status(400).json({ error: "shopId is required" });
        }
        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop)
            return res.status(404).json({ error: "Shop not found" });
        // Get the current manager before removing
        const currentManagerId = shop.managerId;
        const updated = await prisma.shop.update({
            where: { id: shopId },
            data: { managerId: null },
            include: { manager: true },
        });
        // Remove shop ID from user's shopIds array if there was a manager
        if (currentManagerId) {
            try {
                await (0, shopIdManager_1.removeShopIdFromUser)(currentManagerId, shopId);
                logger_1.logger.info(`Removed shop ID ${shopId} from user ${currentManagerId}'s shopIds array`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to remove shop ID from user's shopIds array:`, error);
            }
        }
        return res.json(updated);
    }
    catch (error) {
        console.error("Error unlinking shop from user:", error);
        return res.status(500).json({ error: "Failed to unlink shop from user" });
    }
};
exports.unlinkShopFromUser = unlinkShopFromUser;
// Get all shops (admin sees all, employees see only their shop)
const getAllShops = async (req, res) => {
    try {
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: {
                Role: true,
            },
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        let shops;
        if (user.Role && (0, roles_1.isAdmin)(user.Role.name)) {
            // Admin sees all shops
            shops = await prisma.shop.findMany({
                include: {
                    _count: {
                        select: {
                            inventory: true,
                            restockRequests: true,
                        },
                    },
                    manager: {
                        select: {
                            publicId: true,
                            name: true,
                            email: true,
                            contact: true,
                        },
                    },
                },
            });
        }
        else {
            // Shop managers see only their shops (temporary until shopIds is available)
            const managedShops = await prisma.shop.findMany({
                where: { managerId: userPublicId },
                select: { id: true }
            });
            const userShopIds = managedShops.map(shop => shop.id);
            if (userShopIds.length === 0) {
                return res.status(200).json([]);
            }
            shops = await prisma.shop.findMany({
                where: { id: { in: userShopIds } },
                include: {
                    _count: {
                        select: {
                            inventory: true,
                            restockRequests: true,
                        },
                    },
                    manager: {
                        select: {
                            publicId: true,
                            name: true,
                            email: true,
                            contact: true,
                        },
                    },
                },
            });
        }
        return res.status(200).json(shops);
    }
    catch (error) {
        logger_1.logger.error("Error fetching shops:", error);
        return res.status(500).json({ error: "Failed to fetch shops" });
    }
};
exports.getAllShops = getAllShops;
// Get a single shop by ID (with access control)
const getShopById = async (req, res) => {
    try {
        const { id } = req.params;
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: {
                Role: true,
            },
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        const shop = await prisma.shop.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        inventory: true,
                        restockRequests: true,
                    },
                },
                manager: {
                    select: {
                        publicId: true,
                        name: true,
                        email: true,
                        contact: true,
                    },
                },
            },
        });
        if (!shop) {
            return res.status(404).json({ error: "Shop not found" });
        }
        // Check access: admin can see all, employee only their shop (temporary until shopIds is available)
        if (!user.Role || !(0, roles_1.isAdmin)(user.Role.name)) {
            const managedShops = await prisma.shop.findMany({
                where: { managerId: userPublicId },
                select: { id: true }
            });
            const userShopIds = managedShops.map(shop => shop.id);
            if (!userShopIds.includes(shop.id)) {
                return res.status(403).json({ error: "Access denied to this shop" });
            }
        }
        return res.status(200).json(shop);
    }
    catch (error) {
        logger_1.logger.error("Error fetching shop:", error);
        return res.status(500).json({ error: "Failed to fetch shop" });
    }
};
exports.getShopById = getShopById;
// Update shop (admin can update any, employee only their own)
const updateShop = async (req, res) => {
    try {
        const { id } = req.params;
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: {
                Role: true,
            },
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        // Check access: admin can update any, employee only their shop (temporary until shopIds is available)
        if (!user.Role || !(0, roles_1.isAdmin)(user.Role.name)) {
            const managedShops = await prisma.shop.findMany({
                where: { managerId: userPublicId },
                select: { id: true }
            });
            const userShopIds = managedShops.map(shop => shop.id);
            if (!userShopIds.includes(id)) {
                return res.status(403).json({ error: "Access denied to this shop" });
            }
        }
        // Extract only valid shop fields from request body
        const { name, address, contactNumber, email, operatingHours, description, isActive, managerId } = req.body;
        // Create update data object with only defined values
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (address !== undefined)
            updateData.address = address;
        if (contactNumber !== undefined)
            updateData.contactNumber = contactNumber;
        if (email !== undefined)
            updateData.email = email;
        if (operatingHours !== undefined)
            updateData.operatingHours = operatingHours;
        if (description !== undefined)
            updateData.description = description;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        // Validate and handle managerId if provided
        if (managerId !== undefined) {
            // Prevent managerId from being set to null - it must always be a valid publicId
            if (!managerId || managerId === null) {
                return res.status(400).json({
                    error: "managerId cannot be null or empty. It must be a valid user publicId."
                });
            }
            const manager = await prisma.user.findUnique({
                where: { publicId: managerId },
            });
            if (!manager) {
                return res.status(400).json({ error: "Invalid manager ID - user not found" });
            }
            // Clear any previous management assignments for this user (due to unique constraint)
            await prisma.shop.updateMany({
                where: { managerId: managerId },
                data: { managerId: null },
            });
            updateData.managerId = managerId;
        }
        const shop = await prisma.shop.update({
            where: { id },
            data: updateData,
            include: {
                manager: {
                    select: {
                        publicId: true,
                        name: true,
                        email: true,
                        contact: true,
                    },
                },
            },
        });
        return res.status(200).json(shop);
    }
    catch (error) {
        logger_1.logger.error("Error updating shop:", error);
        return res.status(500).json({ error: "Failed to update shop" });
    }
};
exports.updateShop = updateShop;
// Delete shop (only admin, and only if no manager linked)
const deleteShop = async (req, res) => {
    try {
        const { id } = req.params;
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: { Role: true },
        });
        if (!user || !user.Role || !(0, roles_1.isAdmin)(user.Role.name)) {
            return res.status(403).json({ error: "Admin access required" });
        }
        // Check if shop exists and get related data counts
        const shop = await prisma.shop.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        inventory: true,
                        billings: true,
                        restockRequests: true,
                    },
                },
            },
        });
        if (!shop) {
            return res.status(404).json({ error: "Shop not found" });
        }
        // Check if shop has a manager
        if (shop.managerId) {
            return res.status(400).json({
                error: "Cannot delete shop with linked manager. Unlink them first.",
            });
        }
        // Check if shop has related data
        const hasRelatedData = shop._count.inventory > 0 ||
            shop._count.billings > 0 ||
            shop._count.restockRequests > 0;
        if (hasRelatedData) {
            return res.status(400).json({
                error: "Cannot delete shop with related data. Please delete all inventory, billing, and restock request records first.",
                details: {
                    inventoryCount: shop._count.inventory,
                    billingCount: shop._count.billings,
                    restockRequestCount: shop._count.restockRequests,
                },
            });
        }
        // Use a transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            // Delete the shop (this should work now since we've verified no related data exists)
            await tx.shop.delete({
                where: { id },
            });
        });
        return res.status(200).json({ message: "Shop deleted successfully" });
    }
    catch (error) {
        logger_1.logger.error("Error deleting shop:", error);
        return res.status(500).json({ error: "Failed to delete shop" });
    }
};
exports.deleteShop = deleteShop;
// Force delete shop with cascade (admin only)
const forceDeleteShop = async (req, res) => {
    try {
        const { id } = req.params;
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: { Role: true },
        });
        if (!user || !user.Role || !(0, roles_1.isAdmin)(user.Role.name)) {
            return res.status(403).json({ error: "Admin access required" });
        }
        // Check if shop exists
        const shop = await prisma.shop.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        inventory: true,
                        billings: true,
                        restockRequests: true,
                    },
                },
            },
        });
        if (!shop) {
            return res.status(404).json({ error: "Shop not found" });
        }
        // Use a transaction to cascade delete all related data
        await prisma.$transaction(async (tx) => {
            // First, unlink the manager if exists
            if (shop.managerId) {
                await tx.shop.update({
                    where: { id },
                    data: { managerId: null },
                });
            }
            // Delete all related records in the correct order
            // 1. Delete shop inventory
            await tx.shopInventory.deleteMany({
                where: { shopId: id },
            });
            // 2. Delete restock requests
            await tx.restockRequest.deleteMany({
                where: { shopId: id },
            });
            // 3. Delete billings
            await tx.billing.deleteMany({
                where: { shopId: id },
            });
            // 4. Finally delete the shop
            await tx.shop.delete({
                where: { id },
            });
        });
        return res.status(200).json({
            message: "Shop and all related data deleted successfully",
            deletedData: {
                inventoryCount: shop._count.inventory,
                billingCount: shop._count.billings,
                restockRequestCount: shop._count.restockRequests,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Error force deleting shop:", error);
        return res.status(500).json({ error: "Failed to force delete shop" });
    }
};
exports.forceDeleteShop = forceDeleteShop;
// Link shop manager
const linkShopManager = async (req, res) => {
    try {
        const { id: shopId } = req.params;
        const { userPublicId } = req.body;
        if (!shopId || !userPublicId) {
            return res
                .status(400)
                .json({ error: "Shop ID and User Public ID are required" });
        }
        // Check if current user is admin (the one making the request)
        const currentUser = await prisma.user.findUnique({
            where: { publicId: req.user?.publicId },
            include: { Role: true },
        });
        if (!currentUser || !currentUser.Role || !(0, roles_1.isAdmin)(currentUser.Role.name)) {
            return res.status(403).json({ error: "Admin access required" });
        }
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
        });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }
        // Check if shop exists
        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
        });
        if (!shop) {
            return res.status(404).json({ error: "Shop not found" });
        }
        // Update shop with new manager
        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: { managerId: userPublicId },
            include: {
                manager: {
                    select: {
                        publicId: true,
                        name: true,
                        email: true,
                        contact: true,
                    },
                },
            },
        });
        // Add shop ID to user's shopIds array
        try {
            await (0, shopIdManager_1.addShopIdToUser)(userPublicId, shopId);
            logger_1.logger.info(`Added shop ID ${shopId} to user ${userPublicId}'s shopIds array`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to add shop ID to user's shopIds array:`, error);
        }
        return res.status(200).json(updatedShop);
    }
    catch (error) {
        logger_1.logger.error("Error linking shop manager:", error);
        return res.status(500).json({ error: "Failed to link shop manager" });
    }
};
exports.linkShopManager = linkShopManager;
// Unlink shop manager
const unlinkShopManager = async (req, res) => {
    try {
        const { id: shopId } = req.params;
        // Check if user is admin
        const currentUser = await prisma.user.findUnique({
            where: { publicId: req.user?.publicId },
            include: { Role: true },
        });
        if (!currentUser || !currentUser.Role || !(0, roles_1.isAdmin)(currentUser.Role.name)) {
            return res.status(403).json({ error: "Admin access required" });
        }
        // Check if shop exists
        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
        });
        if (!shop) {
            return res.status(404).json({ error: "Shop not found" });
        }
        // Get the current manager before removing
        const currentManagerId = shop.managerId;
        // Remove manager link
        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: { managerId: null },
            include: {
                manager: {
                    select: {
                        publicId: true,
                        name: true,
                        email: true,
                        contact: true,
                    },
                },
            },
        });
        // Remove shop ID from user's shopIds array if there was a manager
        if (currentManagerId) {
            try {
                await (0, shopIdManager_1.removeShopIdFromUser)(currentManagerId, shopId);
                logger_1.logger.info(`Removed shop ID ${shopId} from user ${currentManagerId}'s shopIds array`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to remove shop ID from user's shopIds array:`, error);
            }
        }
        return res.status(200).json(updatedShop);
    }
    catch (error) {
        logger_1.logger.error("Error unlinking shop manager:", error);
        return res.status(500).json({ error: "Failed to unlink shop manager" });
    }
};
exports.unlinkShopManager = unlinkShopManager;
// Delete all shop data (Admin only)
const deleteAllShopData = async (req, res) => {
    try {
        const { id: shopId } = req.params;
        // Check if user is admin
        const currentUser = await prisma.user.findUnique({
            where: { publicId: req.user?.publicId },
            include: { Role: true },
        });
        if (!currentUser || !currentUser.Role || !(0, roles_1.isAdmin)(currentUser.Role.name)) {
            return res.status(403).json({ error: "Admin access required" });
        }
        // Check if shop exists
        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                _count: {
                    select: {
                        inventory: true,
                        billings: true,
                        restockRequests: true,
                    },
                },
            },
        });
        if (!shop) {
            return res.status(404).json({ error: "Shop not found" });
        }
        // Get the current manager before unlinking
        const currentManagerId = shop.managerId;
        // Use a transaction to ensure all operations succeed or fail together
        // Increase timeout to 30 seconds for large data operations
        const result = await prisma.$transaction(async (tx) => {
            // 1. Unlink manager first (don't delete the employee)
            if (currentManagerId) {
                // Update the shop to remove manager link
                await tx.shop.update({
                    where: { id: shopId },
                    data: { managerId: null },
                });
                // Update the user to remove shop from their managed shops
                await tx.user.update({
                    where: { publicId: currentManagerId },
                    data: {
                        shopIds: {
                            set: [], // Clear all shop IDs for now, we'll add back the others
                        },
                    },
                });
                // Get all other shops this user manages (excluding the current one)
                const user = await tx.user.findUnique({
                    where: { publicId: currentManagerId },
                    select: { shopIds: true },
                });
                if (user && user.shopIds) {
                    const otherShops = user.shopIds.filter(id => id !== shopId);
                    await tx.user.update({
                        where: { publicId: currentManagerId },
                        data: {
                            shopIds: {
                                set: otherShops,
                            },
                        },
                    });
                }
                logger_1.logger.info(`Unlinked manager ${currentManagerId} from shop ${shopId}`);
            }
            // 2. Delete all shop inventory records
            const deletedInventory = await tx.shopInventory.deleteMany({
                where: { shopId: shopId },
            });
            // 3. Delete all restock requests for this shop
            const deletedRestockRequests = await tx.restockRequest.deleteMany({
                where: { shopId: shopId },
            });
            // 4. Delete all billing records for this shop
            const deletedBillings = await tx.billing.deleteMany({
                where: { shopId: shopId },
            });
            // 5. Finally delete the shop itself
            const deletedShop = await tx.shop.delete({
                where: { id: shopId },
            });
            return {
                shop: deletedShop,
                inventory: deletedInventory.count,
                restockRequests: deletedRestockRequests.count,
                billings: deletedBillings.count,
                managerUnlinked: !!currentManagerId,
            };
        }, {
            timeout: 30000, // 30 seconds timeout for large data operations
        });
        logger_1.logger.info(`Successfully deleted all data for shop ${shopId}:`, {
            inventoryRecords: result.inventory,
            restockRequests: result.restockRequests,
            billingRecords: result.billings,
            managerUnlinked: result.managerUnlinked,
        });
        return res.status(200).json({
            message: "All shop data deleted successfully",
            shopId: shopId,
            deletedRecords: {
                inventory: result.inventory,
                restockRequests: result.restockRequests,
                billings: result.billings,
                managerUnlinked: result.managerUnlinked,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Error deleting all shop data:", error);
        // Check if it's a transaction timeout error
        if (error.code === 'P2028') {
            return res.status(408).json({
                error: "Operation timed out. The shop may have too much data. Please try again or contact support."
            });
        }
        // Check if it's a foreign key constraint error
        if (error.code === 'P2003') {
            return res.status(409).json({
                error: "Cannot delete shop due to related data constraints. Please try unlinking the manager first."
            });
        }
        return res.status(500).json({
            error: "Failed to delete all shop data",
            details: error.message
        });
    }
};
exports.deleteAllShopData = deleteAllShopData;

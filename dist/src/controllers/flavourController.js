"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlavorProductStats = exports.hardDeleteFlavor = exports.deleteFlavor = exports.updateFlavor = exports.getFlavorById = exports.getFlavors = exports.createFlavor = void 0;
const client_1 = require("../config/client");
const NotificationsController_1 = require("./NotificationsController");
const audit_1 = require("../utils/audit");
const createFlavor = async (req, res) => {
    try {
        const { name, imageUrl } = req.body;
        const flavor = await client_1.prisma.flavor.create({
            data: {
                name: name,
                imageUrl: imageUrl,
            },
        });
        try {
            const userId = req.user?.publicId;
            if (userId) {
                const created = await client_1.prisma.notification.create({
                    data: { userId, type: "FLAVOR_CREATED", message: `Created flavor ${flavor.name}` },
                });
                await (0, NotificationsController_1.emitUserNotification)(userId.toString(), { event: "created", notification: created });
            }
        }
        catch { }
        res.status(201).json(flavor);
        await (0, audit_1.logActivity)({
            type: "flavor",
            action: "created",
            entity: "Flavor",
            entityId: flavor.id,
            userId: req.user?.publicId,
            meta: { name: flavor.name }
        });
    }
    catch (error) {
        console.error("Error creating flavor:", error);
        if (error.code === "P2002") {
            return res
                .status(400)
                .json({ error: "A flavor with this name already exists" });
        }
        res.status(500).json({ error: "Failed to create flavor" });
    }
};
exports.createFlavor = createFlavor;
const getFlavors = async (req, res) => {
    try {
        const { isActive } = req.query;
        const where = {};
        if (isActive !== undefined) {
            where.isActive = isActive === "true";
        }
        else {
            where.isActive = true; // Default to active flavors
        }
        const flavors = await client_1.prisma.flavor.findMany({
            where,
            orderBy: {
                name: "asc",
            },
        });
        res.json(flavors);
    }
    catch (error) {
        console.error("Error fetching flavors:", error);
        res.status(500).json({ error: "Failed to fetch flavors" });
    }
};
exports.getFlavors = getFlavors;
const getFlavorById = async (req, res) => {
    try {
        const { id } = req.params;
        const flavor = await client_1.prisma.flavor.findUnique({
            where: { id },
            include: {
                products: {
                    where: {
                        isActive: true,
                    },
                    include: {
                        category: true,
                    },
                },
            },
        });
        if (!flavor) {
            return res.status(404).json({ error: "Flavor not found" });
        }
        res.json(flavor);
    }
    catch (error) {
        console.error("Error fetching flavor:", error);
        res.status(500).json({ error: "Failed to fetch flavor" });
    }
};
exports.getFlavorById = getFlavorById;
const updateFlavor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, imageUrl, isActive } = req.body;
        // Check if flavor exists
        const existingFlavor = await client_1.prisma.flavor.findUnique({
            where: { id },
        });
        if (!existingFlavor) {
            return res.status(404).json({ error: "Flavor not found" });
        }
        const flavor = await client_1.prisma.flavor.update({
            where: { id },
            data: {
                name,
                imageUrl,
                isActive,
            },
        });
        res.json(flavor);
    }
    catch (error) {
        console.error("Error updating flavor:", error);
        if (error.code === "P2002") {
            return res
                .status(400)
                .json({ error: "A flavor with this name already exists" });
        }
        res.status(500).json({ error: "Failed to update flavor" });
    }
};
exports.updateFlavor = updateFlavor;
const deleteFlavor = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft delete - mark as inactive
        await client_1.prisma.flavor.update({
            where: { id },
            data: {
                isActive: false,
            },
        });
        res.json({ message: "Flavor deactivated successfully" });
    }
    catch (error) {
        console.error("Error deactivating flavor:", error);
        res.status(500).json({ error: "Failed to delete flavor" });
    }
};
exports.deleteFlavor = deleteFlavor;
const hardDeleteFlavor = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if there are any related products
        const relatedProducts = await client_1.prisma.product.findMany({
            where: { flavorId: id },
        });
        if (relatedProducts.length > 0) {
            return res.status(400).json({
                error: "Cannot delete flavor with existing products",
                count: relatedProducts.length,
            });
        }
        // Hard delete - remove from database
        await client_1.prisma.flavor.delete({
            where: { id },
        });
        res.json({ message: "Flavor permanently deleted" });
    }
    catch (error) {
        console.error("Error deleting flavor:", error);
        res.status(500).json({ error: "Failed to delete flavor" });
    }
};
exports.hardDeleteFlavor = hardDeleteFlavor;
const getFlavorProductStats = async (req, res) => {
    try {
        const flavorStats = await client_1.prisma.flavor.findMany({
            where: {
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        products: {
                            where: {
                                isActive: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });
        const formattedStats = flavorStats.map((flavor) => ({
            id: flavor.id,
            name: flavor.name,
            productCount: flavor._count.products,
        }));
        res.json(formattedStats);
    }
    catch (error) {
        console.error("Error fetching flavor stats:", error);
        res.status(500).json({ error: "Failed to fetch flavor statistics" });
    }
};
exports.getFlavorProductStats = getFlavorProductStats;

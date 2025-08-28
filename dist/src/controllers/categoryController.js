"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.getCategoryById = exports.getCategories = exports.createCategory = void 0;
const client_1 = require("../config/client");
const NotificationsController_1 = require("./NotificationsController");
const audit_1 = require("../utils/audit");
const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await client_1.prisma.category.create({
            data: {
                name,
                description,
            },
        });
        try {
            const userId = req.user?.publicId;
            if (userId) {
                const created = await client_1.prisma.notification.create({
                    data: { userId, type: 'CATEGORY_CREATED', message: `Created category ${category.name}` },
                });
                await (0, NotificationsController_1.emitUserNotification)(userId, { event: 'created', notification: created });
            }
        }
        catch { }
        res.status(201).json(category);
        await (0, audit_1.logActivity)({
            type: 'category', action: 'created', entity: 'Category', entityId: category.id,
            userId: req.user?.publicId, meta: { name }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create category' });
    }
};
exports.createCategory = createCategory;
const getCategories = async (req, res) => {
    try {
        const categories = await client_1.prisma.category.findMany({
            where: {
                isActive: true,
            },
        });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};
exports.getCategories = getCategories;
const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await client_1.prisma.category.findUnique({
            where: { id },
            include: {
                products: true,
            },
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        try {
            const userId = req.user?.publicId;
            if (userId) {
                const updated = await client_1.prisma.notification.create({
                    data: { userId, type: 'CATEGORY_UPDATED', message: `Updated category ${category.name}` },
                });
                await (0, NotificationsController_1.emitUserNotification)(userId, { event: 'created', notification: updated });
            }
        }
        catch { }
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch category' });
    }
};
exports.getCategoryById = getCategoryById;
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        const category = await client_1.prisma.category.update({
            where: { id },
            data: {
                name,
                description,
                isActive,
            },
        });
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update category' });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await client_1.prisma.category.update({
            where: { id },
            data: {
                isActive: false,
            },
        });
        try {
            const userId = req.user?.publicId;
            if (userId) {
                const deleted = await client_1.prisma.notification.create({
                    data: { userId, type: 'CATEGORY_DEACTIVATED', message: `Deactivated category ${id}` },
                });
                await (0, NotificationsController_1.emitUserNotification)(userId, { event: 'created', notification: deleted });
            }
        }
        catch { }
        res.json({ message: 'Category deactivated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
};
exports.deleteCategory = deleteCategory;

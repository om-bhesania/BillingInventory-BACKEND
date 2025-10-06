import { Request, Response } from 'express';
import { prisma } from '../config/client';
import { emitUserNotification } from './NotificationsController';
import { logActivity } from '../utils/audit';

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        const category = await prisma.category.create({
            data: {
                name,
                description,
            },
        });
        try {
            const userId = (req as any).user?.publicId as string | undefined;
            if (userId) {
                const created = await prisma.notification.create({
                    data: { userId, type: 'CATEGORY_CREATED', message: `Created category ${category.name}` },
                });
                await emitUserNotification(userId, { event: 'created', notification: created });
            }
        } catch {}
        res.status(201).json(category);
        await logActivity({
            type: 'category', action: 'created', entity: 'Category', entityId: category.id,
            userId: (req as any).user?.publicId, metadata: { name }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create category' });
    }
};

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            where: {
                isActive: true,
            },
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

export const getCategoryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                products: true,
            },
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        try {
            const userId = (req as any).user?.publicId as string | undefined;
            if (userId) {
                const updated = await prisma.notification.create({
                    data: { userId, type: 'CATEGORY_UPDATED', message: `Updated category ${category.name}` },
                });
                await emitUserNotification(userId, { event: 'created', notification: updated });
            }
        } catch {}
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch category' });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        const category = await prisma.category.update({
            where: { id },
            data: {
                name,
                description,
                isActive,
            },
        });
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update category' });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.category.update({
            where: { id },
            data: {
                isActive: false,
            },
        });
        try {
            const userId = (req as any).user?.publicId as string | undefined;
            if (userId) {
                const deleted = await prisma.notification.create({
                    data: { userId, type: 'CATEGORY_DEACTIVATED', message: `Deactivated category ${id}` },
                });
                await emitUserNotification(userId, { event: 'created', notification: deleted });
            }
        } catch {}
        res.json({ message: 'Category deactivated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
}; 
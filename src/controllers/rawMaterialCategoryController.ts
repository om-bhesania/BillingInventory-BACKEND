import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/client';
import { emitUserNotification } from './NotificationsController';
import { logActivity } from '../utils/audit';
import { isAdmin } from '../config/roles';

export const createRawMaterialCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description } = req.body;
        const userId = (req as any).user?.publicId as string | undefined;
        const userRole = (req as any).user?.role;

        // Only Admin can create raw material categories
        if (!isAdmin(userRole)) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        const category = await (prisma as any).rawMaterialCategory.create({
            data: {
                name,
                description,
            },
        });

        try {
            if (userId) {
                const created = await prisma.notification.create({
                    data: { 
                        userId, 
                        type: 'RAW_MATERIAL_CATEGORY_CREATED', 
                        message: `Created raw material category: ${category.name}` 
                    },
                });
                await emitUserNotification(userId, { event: 'created', notification: created });
            }
        } catch (notificationError) {
            console.error('Notification error:', notificationError);
        }

        await logActivity({
            type: 'raw_material_category', 
            action: 'created', 
            entity: 'RawMaterialCategory', 
            entityId: category.id,
            userId, 
            metadata: { name }
        });
        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating raw material category:', error);
        res.status(500).json({ error: 'Failed to create raw material category' });
    }
};

export const getRawMaterialCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const categories = await (prisma as any).rawMaterialCategory.findMany({
            where: {
                isActive: true,
            },
            orderBy: {
                name: 'asc'
            }
        });
        res.json(categories);
    } catch (error) {
        console.error('Error fetching raw material categories:', error);
        res.status(500).json({ error: 'Failed to fetch raw material categories' });
    }
};

export const getRawMaterialCategoryById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const category = await (prisma as any).rawMaterialCategory.findUnique({
            where: { id },
            include: {
                materials: {
                    where: { isActive: true },
                    include: {
                        supplier: true
                    }
                },
            },
        });
        if (!category) {
            res.status(404).json({ error: 'Raw material category not found' });
            return;
        }
        res.json(category);
    } catch (error) {
        console.error('Error fetching raw material category:', error);
        res.status(500).json({ error: 'Failed to fetch raw material category' });
    }
};

export const updateRawMaterialCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        const userId = (req as any).user?.publicId as string | undefined;
        const userRole = (req as any).user?.role;

        // Only Admin can update raw material categories
        if (!isAdmin(userRole)) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        const category = await (prisma as any).rawMaterialCategory.update({
            where: { id },
            data: {
                name,
                description,
                isActive,
            },
        });

        try {
            if (userId) {
                const updated = await prisma.notification.create({
                    data: { 
                        userId, 
                        type: 'RAW_MATERIAL_CATEGORY_UPDATED', 
                        message: `Updated raw material category: ${category.name}` 
                    },
                });
                await emitUserNotification(userId, { event: 'created', notification: updated });
            }
        } catch (notificationError) {
            console.error('Notification error:', notificationError);
        }

        await logActivity({
            type: 'raw_material_category', 
            action: 'updated', 
            entity: 'RawMaterialCategory', 
            entityId: category.id,
            userId, 
            metadata: { name }
        });
        res.json(category);
    } catch (error) {
        console.error('Error updating raw material category:', error);
        res.status(500).json({ error: 'Failed to update raw material category' });
    }
};

export const deleteRawMaterialCategory = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.publicId as string | undefined;
        const userRole = (req as any).user?.role;

        // Only Admin can delete raw material categories
        if (!isAdmin(userRole)) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        await (prisma as any).rawMaterialCategory.update({
            where: { id },
            data: {
                isActive: false,
            },
        });

        try {
            if (userId) {
                const deleted = await prisma.notification.create({
                    data: { 
                        userId, 
                        type: 'RAW_MATERIAL_CATEGORY_DEACTIVATED', 
                        message: `Deactivated raw material category: ${id}` 
                    },
                });
                await emitUserNotification(userId, { event: 'created', notification: deleted });
            }
        } catch (notificationError) {
            console.error('Notification error:', notificationError);
        }

        await logActivity({
            type: 'raw_material_category', 
            action: 'deleted', 
            entity: 'RawMaterialCategory', 
            entityId: id,
            userId, 
            metadata: { categoryId: id }
        });
        res.json({ message: 'Raw material category deactivated successfully' });
    } catch (error) {
        console.error('Error deleting raw material category:', error);
        res.status(500).json({ error: 'Failed to delete raw material category' });
    }
};

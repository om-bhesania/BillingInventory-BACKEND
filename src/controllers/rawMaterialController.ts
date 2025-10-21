import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/client';
import { emitUserNotification } from './NotificationsController';
import { logActivity } from '../utils/audit';
import { isAdmin, isShopOwner } from '../config/roles';

export const createRawMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const { 
            name, 
            categoryId, 
            supplierId, 
            unit, 
            unitPrice, 
            isPerishable, 
            shelfLife 
        } = req.body;
        const userId = (req as any).user?.publicId as string | undefined;
        const userRole = (req as any).user?.role;

        // Both Admin and Shop Owner can create raw materials
        if (!isAdmin(userRole) && !isShopOwner(userRole)) {
            res.status(403).json({ error: 'Admin or Shop Owner access required' });
            return;
        }

        const rawMaterial = await (prisma as any).rawMaterial.create({
            data: {
                name,
                categoryId,
                supplierId,
                unit,
                unitPrice: parseFloat(unitPrice),
                isPerishable: isPerishable === 'true' || isPerishable === true,
                shelfLife: isPerishable ? parseInt(shelfLife) : null,
                createdBy: userId || 'system', // Track who created this material
            },
            include: {
                category: true,
                supplier: true
            }
        });

        try {
            if (userId) {
                const created = await prisma.notification.create({
                    data: { 
                        userId, 
                        type: 'RAW_MATERIAL_CREATED', 
                        message: `Created raw material: ${rawMaterial.name}` 
                    },
                });
                await emitUserNotification(userId, { event: 'created', notification: created });
            }
        } catch (notificationError) {
            console.error('Notification error:', notificationError);
        }

        res.status(201).json(rawMaterial);
        await logActivity({
            type: 'raw_material', 
            action: 'created', 
            entity: 'RawMaterial', 
            entityId: rawMaterial.id,
            userId, 
            metadata: { name, categoryId, supplierId, isPerishable }
        });
    } catch (error) {
        console.error('Error creating raw material:', error);
        res.status(500).json({ error: 'Failed to create raw material' });
    }
};

export const getRawMaterials = async (req: Request, res: Response): Promise<void> => {
    try {
        const { categoryId, isPerishable, shopId } = req.query;
        const shopIdString = Array.isArray(shopId) ? shopId[0] : shopId;
        const userRole = (req as any).user?.role;
        const userId = (req as any).user?.publicId as string | undefined;

        let whereClause: any = {
            isActive: true,
        };

        // Data isolation: Shop owners can only see materials they created (packaging materials)
        if (isShopOwner(userRole)) {
            whereClause.createdBy = userId; // Shop owners only see their own materials
        }
        // Admins can see all materials (no additional filter)

        // Filter by category if provided
        if (categoryId) {
            whereClause.categoryId = categoryId;
        }

        // Filter by perishable status if provided
        if (isPerishable !== undefined) {
            whereClause.isPerishable = isPerishable === 'true';
        }

        const rawMaterials = await (prisma as any).rawMaterial.findMany({
            where: whereClause,
            include: {
                category: true,
                supplier: true,
                inventories: {
                    where: shopIdString ? { shopId: shopIdString as string } : undefined,
                    include: {
                        shop: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.json(rawMaterials);
    } catch (error) {
        console.error('Error fetching raw materials:', error);
        res.status(500).json({ error: 'Failed to fetch raw materials' });
    }
};

export const getRawMaterialById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userRole = (req as any).user?.role;
        const userId = (req as any).user?.publicId as string | undefined;

        const rawMaterial = await (prisma as any).rawMaterial.findUnique({
            where: { id },
            include: {
                category: true,
                supplier: true,
                inventories: {
                    include: {
                        shop: true
                    }
                },
                transactions: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 10
                }
            },
        });
        
        if (!rawMaterial) {
            res.status(404).json({ error: 'Raw material not found' });
            return;
        }

        // Data isolation: Shop owners can only access materials they created
        if (isShopOwner(userRole) && rawMaterial.createdBy !== userId) {
            res.status(403).json({ error: 'Access denied: You can only view materials you created' });
            return;
        }
        res.json(rawMaterial);
    } catch (error) {
        console.error('Error fetching raw material:', error);
        res.status(500).json({ error: 'Failed to fetch raw material' });
    }
};

export const updateRawMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { 
            name, 
            categoryId, 
            supplierId, 
            unit, 
            unitPrice, 
            isPerishable, 
            shelfLife,
            isActive 
        } = req.body;
        const userId = (req as any).user?.publicId as string | undefined;
        const userRole = (req as any).user?.role;

        // Both Admin and Shop Owner can update materials, but Shop Owners can only update their own
        if (!isAdmin(userRole) && !isShopOwner(userRole)) {
            res.status(403).json({ error: 'Admin or Shop Owner access required' });
            return;
        }

        // Check if material exists and if shop owner can update it
        const existingMaterial = await (prisma as any).rawMaterial.findUnique({
            where: { id },
            select: { createdBy: true }
        });

        if (!existingMaterial) {
            res.status(404).json({ error: 'Raw material not found' });
            return;
        }

        // Data isolation: Shop owners can only update materials they created
        if (isShopOwner(userRole) && existingMaterial.createdBy !== userId) {
            res.status(403).json({ error: 'Access denied: You can only update materials you created' });
            return;
        }

        const rawMaterial = await (prisma as any).rawMaterial.update({
            where: { id },
            data: {
                name,
                categoryId,
                supplierId,
                unit,
                unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
                isPerishable: isPerishable !== undefined ? (isPerishable === 'true' || isPerishable === true) : undefined,
                shelfLife: isPerishable ? parseInt(shelfLife) : null,
                isActive,
            },
            include: {
                category: true,
                supplier: true
            }
        });

        try {
            if (userId) {
                const updated = await prisma.notification.create({
                    data: { 
                        userId, 
                        type: 'RAW_MATERIAL_UPDATED', 
                        message: `Updated raw material: ${rawMaterial.name}` 
                    },
                });
                await emitUserNotification(userId, { event: 'created', notification: updated });
            }
        } catch (notificationError) {
            console.error('Notification error:', notificationError);
        }

        res.json(rawMaterial);
        await logActivity({
            type: 'raw_material', 
            action: 'updated', 
            entity: 'RawMaterial', 
            entityId: rawMaterial.id,
            userId, 
            metadata: { name, categoryId, supplierId }
        });
    } catch (error) {
        console.error('Error updating raw material:', error);
        res.status(500).json({ error: 'Failed to update raw material' });
    }
};

export const deleteRawMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.publicId as string | undefined;
        const userRole = (req as any).user?.role;

        // Both Admin and Shop Owner can delete materials, but Shop Owners can only delete their own
        if (!isAdmin(userRole) && !isShopOwner(userRole)) {
            res.status(403).json({ error: 'Admin or Shop Owner access required' });
            return;
        }

        // Check if material exists and if shop owner can delete it
        const existingMaterial = await (prisma as any).rawMaterial.findUnique({
            where: { id },
            select: { createdBy: true }
        });

        if (!existingMaterial) {
            res.status(404).json({ error: 'Raw material not found' });
            return;
        }

        // Data isolation: Shop owners can only delete materials they created
        if (isShopOwner(userRole) && existingMaterial.createdBy !== userId) {
            res.status(403).json({ error: 'Access denied: You can only delete materials you created' });
            return;
        }

        await (prisma as any).rawMaterial.update({
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
                        type: 'RAW_MATERIAL_DEACTIVATED', 
                        message: `Deactivated raw material: ${id}` 
                    },
                });
                await emitUserNotification(userId, { event: 'created', notification: deleted });
            }
        } catch (notificationError) {
            console.error('Notification error:', notificationError);
        }

        res.json({ message: 'Raw material deactivated successfully' });
        await logActivity({
            type: 'raw_material', 
            action: 'deleted', 
            entity: 'RawMaterial', 
            entityId: id,
            userId, 
            metadata: { rawMaterialId: id }
        });
    } catch (error) {
        console.error('Error deleting raw material:', error);
        res.status(500).json({ error: 'Failed to delete raw material' });
    }
};

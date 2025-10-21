import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/client';
import { emitUserNotification } from './NotificationsController';
import { logActivity } from '../utils/audit';
import { isAdmin, isShopOwner } from '../config/roles';
import { getSocketService } from '../services/socketService';

export const createRawMaterialInventory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { 
            shopId, 
            materialId, 
            currentStock, 
            minStockLevel, 
            maxStockLevel,
            batchNumber,
            expiryDate 
        } = req.body;
        const userId = (req as any).user?.publicId as string | undefined;
        const userRole = (req as any).user?.role;

        // Check permissions
        if (!isAdmin(userRole) && !isShopOwner(userRole)) {
            res.status(403).json({ error: 'Admin or Shop Owner access required' });
            return;
        }

        // If shop owner, they can only manage their own shop's inventory
        if (isShopOwner(userRole) && !shopId) {
            res.status(400).json({ error: 'Shop ID is required for shop owners' });
            return;
        }

        const inventory = await (prisma as any).rawMaterialInventory.create({
            data: {
                shopId,
                materialId,
                currentStock: parseFloat(currentStock),
                minStockLevel: parseFloat(minStockLevel),
                maxStockLevel: maxStockLevel ? parseFloat(maxStockLevel) : null,
                batchNumber,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
            },
            include: {
                material: {
                    include: {
                        category: true,
                        supplier: true
                    }
                },
                shop: true
            }
        });

        // Create transaction record
        await (prisma as any).rawMaterialTransaction.create({
            data: {
                materialId,
                shopId,
                transactionType: 'PURCHASE',
                quantity: parseFloat(currentStock),
                unit: inventory.material.unit,
                unitPrice: inventory.material.unitPrice,
                totalAmount: parseFloat(currentStock) * parseFloat(inventory.material.unitPrice.toString()),
                reason: 'Initial stock',
                batchNumber,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                createdBy: userId || 'system'
            }
        });

        // Check for low stock alert and broadcast
        await checkLowStockAlert(inventory, userId);
        
        // Broadcast inventory update
        const socketService = getSocketService();
        socketService.broadcastRawMaterialInventoryUpdate({
          materialId: inventory.materialId,
          shopId: inventory.shopId,
          currentStock: inventory.currentStock,
          materialName: inventory.material.name,
          unit: inventory.material.unit
        });

        try {
            if (userId) {
                const created = await prisma.notification.create({
                    data: { 
                        userId, 
                        type: 'RAW_MATERIAL_INVENTORY_CREATED', 
                        message: `Added ${inventory.material.name} to inventory` 
                    },
                });
                await emitUserNotification(userId, { event: 'created', notification: created });
            }
        } catch (notificationError) {
            console.error('Notification error:', notificationError);
        }

        res.status(201).json(inventory);
        await logActivity({
            type: 'raw_material_inventory', 
            action: 'created', 
            entity: 'RawMaterialInventory', 
            entityId: inventory.id,
            userId, 
            metadata: { materialId, shopId, currentStock }
        });
    } catch (error) {
        console.error('Error creating raw material inventory:', error);
        res.status(500).json({ error: 'Failed to create raw material inventory' });
    }
};

export const getRawMaterialInventories = async (req: Request, res: Response): Promise<void> => {
    try {
        const { shopId, materialId, lowStock } = req.query;
        const userRole = (req as any).user?.role;
        const user = (req as any).user;

        let whereClause: any = {};

        // Filter by shop
        if (shopId) {
            whereClause.shopId = shopId;
        }

        // Filter by material
        if (materialId) {
            whereClause.materialId = materialId;
        }

        // Filter for low stock items - this will be handled in application logic
        // since Prisma doesn't support dynamic field comparisons

        const inventories = await (prisma as any).rawMaterialInventory.findMany({
            where: whereClause,
            include: {
                material: {
                    include: {
                        category: true,
                        supplier: true
                    }
                },
                shop: true
            },
            orderBy: {
                lastUpdated: 'desc'
            }
        });

        // Filter for low stock items if requested
        let filteredInventories = inventories;
        if (lowStock === 'true') {
            filteredInventories = inventories.filter((inventory:any) => 
                inventory.currentStock <= inventory.minStockLevel
            );
        }

        res.json(filteredInventories);
    } catch (error) {
        console.error('Error fetching raw material inventories:', error);
        res.status(500).json({ error: 'Failed to fetch raw material inventories' });
    }
};

export const updateRawMaterialInventory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { 
            currentStock, 
            minStockLevel, 
            maxStockLevel,
            batchNumber,
            expiryDate 
        } = req.body;
        const userId = (req as any).user?.publicId as string | undefined;
        const userRole = (req as any).user?.role;

        // Check permissions
        if (!isAdmin(userRole) && !isShopOwner(userRole)) {
            res.status(403).json({ error: 'Admin or Shop Owner access required' });
            return;
        }

        const existingInventory = await (prisma as any).rawMaterialInventory.findUnique({
            where: { id },
            include: {
                material: true,
                shop: true
            }
        });

        if (!existingInventory) {
            res.status(404).json({ error: 'Raw material inventory not found' });
            return;
        }

        const oldStock = existingInventory.currentStock;
        const newStock = parseFloat(currentStock);

        const inventory = await (prisma as any).rawMaterialInventory.update({
            where: { id },
            data: {
                currentStock: newStock,
                minStockLevel: minStockLevel ? parseFloat(minStockLevel) : undefined,
                maxStockLevel: maxStockLevel ? parseFloat(maxStockLevel) : undefined,
                batchNumber,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                lastUpdated: new Date()
            },
            include: {
                material: {
                    include: {
                        category: true,
                        supplier: true
                    }
                },
                shop: true
            }
        });

        // Create transaction record for stock change
        if (oldStock !== newStock) {
            const transactionType = newStock > oldStock ? 'ADJUSTMENT' : 'CONSUMPTION';
            await (prisma as any).rawMaterialTransaction.create({
                data: {
                    materialId: inventory.materialId,
                    shopId: inventory.shopId,
                    transactionType,
                    quantity: Math.abs(newStock - oldStock),
                    unit: inventory.material.unit,
                    unitPrice: inventory.material.unitPrice,
                    reason: `Stock adjustment from ${oldStock} to ${newStock}`,
                    batchNumber,
                    expiryDate: expiryDate ? new Date(expiryDate) : null,
                    createdBy: userId || 'system'
                }
            });
        }

        // Check for low stock alert
        await checkLowStockAlert(inventory, userId);

        try {
            if (userId) {
                const updated = await prisma.notification.create({
                    data: { 
                        userId, 
                        type: 'RAW_MATERIAL_INVENTORY_UPDATED', 
                        message: `Updated ${inventory.material.name} inventory` 
                    },
                });
                await emitUserNotification(userId, { event: 'created', notification: updated });
            }
        } catch (notificationError) {
            console.error('Notification error:', notificationError);
        }

        res.json(inventory);
        await logActivity({
            type: 'raw_material_inventory', 
            action: 'updated', 
            entity: 'RawMaterialInventory', 
            entityId: inventory.id,
            userId, 
            metadata: { materialId: inventory.materialId, shopId: inventory.shopId, oldStock, newStock }
        });
    } catch (error) {
        console.error('Error updating raw material inventory:', error);
        res.status(500).json({ error: 'Failed to update raw material inventory' });
    }
};

export const deleteRawMaterialInventory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.publicId as string | undefined;
        const userRole = (req as any).user?.role;

        // Only Admin can delete inventory
        if (!isAdmin(userRole)) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        await (prisma as any).rawMaterialInventory.delete({
            where: { id }
        });

        try {
            if (userId) {
                const deleted = await prisma.notification.create({
                    data: { 
                        userId, 
                        type: 'RAW_MATERIAL_INVENTORY_DELETED', 
                        message: `Deleted raw material inventory: ${id}` 
                    },
                });
                await emitUserNotification(userId, { event: 'created', notification: deleted });
            }
        } catch (notificationError) {
            console.error('Notification error:', notificationError);
        }

        res.json({ message: 'Raw material inventory deleted successfully' });
        await logActivity({
            type: 'raw_material_inventory', 
            action: 'deleted', 
            entity: 'RawMaterialInventory', 
            entityId: id,
            userId, 
            metadata: { inventoryId: id }
        });
    } catch (error) {
        console.error('Error deleting raw material inventory:', error);
        res.status(500).json({ error: 'Failed to delete raw material inventory' });
    }
};

// Helper function to check for low stock alerts
async function checkLowStockAlert(inventory: any, userId?: string): Promise<void> {
    try {
        const stockPercentage = (inventory.currentStock / inventory.minStockLevel) * 100;
        const isLowStock = stockPercentage <= 30; // 30% threshold
        
        if (isLowStock) {
            const socketService = getSocketService();
            
            // Emit raw material low stock alert
            socketService.broadcastRawMaterialLowStockAlert({
                materialId: inventory.materialId,
                shopId: inventory.shopId,
                currentStock: inventory.currentStock,
                minStockLevel: inventory.minStockLevel,
                percentage: stockPercentage,
                materialName: inventory.material.name,
                unit: inventory.material.unit,
                isPerishable: inventory.material.isPerishable
            });

            // Create notification for admin users
            if (userId) {
                const adminUsers = await prisma.user.findMany({
                    where: { role: 'Admin' },
                    select: { publicId: true }
                });

                for (const admin of adminUsers) {
                    await prisma.notification.create({
                        data: {
                            userId: admin.publicId,
                            type: 'LOW_STOCK_ALERT',
                            category: 'RAW_MATERIAL',
                            message: `${inventory.material.name} is running low in ${inventory.shop?.name || 'Factory'} (${inventory.currentStock} ${inventory.material.unit})`,
                            priority: 'HIGH',
                            metadata: {
                                materialId: inventory.materialId,
                                shopId: inventory.shopId,
                                currentStock: inventory.currentStock,
                                minStockLevel: inventory.minStockLevel
                            }
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error checking low stock alert:', error);
    }
}

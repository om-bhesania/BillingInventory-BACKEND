import { Request, Response } from 'express';
import { prisma } from '../config/client';
import { logger } from '../utils/logger';
import { emitUserNotification } from './NotificationsController';

export class StockAdjustmentController {
  // Create stock adjustment request
  static async createStockAdjustment(req: Request, res: Response): Promise<void> {
    try {
      const { shopId, productId, currentStock, adjustedStock, reason, customReason, notes } = req.body;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify the shop belongs to the user
      const shop = await prisma.shop.findFirst({
        where: {
          id: shopId,
          managerId: userId
        }
      });

      if (!shop) {
        res.status(403).json({ error: 'Access denied to this shop' });
        return;
      }

      // Verify the product exists
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const stockAdjustment = await prisma.stockAdjustmentRequest.create({
        data: {
          shopId,
          productId,
          currentStock,
          adjustedStock,
          reason,
          customReason,
          requestedBy: userId,
          notes
        },
        include: {
          shop: {
            select: {
              name: true,
              managerId: true
            }
          },
          product: {
            select: {
              name: true,
              sku: true,
              unitPrice: true
            }
          }
        }
      });

      // Notify admins about new stock adjustment request
      const adminUsers = await prisma.user.findMany({
        where: { role: 'Admin' },
        select: { publicId: true, name: true }
      });

      for (const admin of adminUsers) {
        await prisma.notification.create({
          data: {
            userId: admin.publicId,
            type: 'STOCK_ADJUSTMENT',
            message: `New stock adjustment request from ${stockAdjustment.shop.name} for ${stockAdjustment.product.name}`
          }
        });

        emitUserNotification(admin.publicId, {
          event: 'stock_adjustment_requested',
          notification: {
            type: 'STOCK_ADJUSTMENT',
            message: `New stock adjustment request from ${stockAdjustment.shop.name} for ${stockAdjustment.product.name}`,
            stockAdjustmentId: stockAdjustment.id
          }
        });
      }

      res.status(201).json({
        success: true,
        data: stockAdjustment
      });
    } catch (error) {
      logger.error('Error creating stock adjustment request:', error);
      res.status(500).json({ error: 'Failed to create stock adjustment request' });
    }
  }

  // Get stock adjustment requests
  static async getStockAdjustments(req: Request, res: Response): Promise<void> {
    try {
      const { status, shopId } = req.query;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { publicId: userId },
        select: { role: true, managedShops: true }
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      let whereClause: any = {};

      if (user.role === 'Admin') {
        // Admin can see all requests
        if (status) whereClause.status = status;
        if (shopId) whereClause.shopId = shopId;
      } else {
        // Shop owners can only see their own requests
        whereClause.shopId = { in: user.managedShops.map(shop => shop.id) };
        if (status) whereClause.status = status;
      }

      const stockAdjustments = await prisma.stockAdjustmentRequest.findMany({
        where: whereClause,
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              managerId: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unitPrice: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: stockAdjustments
      });
    } catch (error) {
      logger.error('Error fetching stock adjustments:', error);
      res.status(500).json({ error: 'Failed to fetch stock adjustments' });
    }
  }

  // Approve/reject stock adjustment request (admin only)
  static async updateStockAdjustmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { adjustmentId } = req.params;
      const { status, notes } = req.body;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { publicId: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'Admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const stockAdjustment = await prisma.stockAdjustmentRequest.findUnique({
        where: { id: adjustmentId },
        include: {
          shop: {
            select: {
              name: true,
              managerId: true
            }
          },
          product: {
            select: {
              name: true,
              sku: true
            }
          }
        }
      });

      if (!stockAdjustment) {
        res.status(404).json({ error: 'Stock adjustment request not found' });
        return;
      }

      if (stockAdjustment.status !== 'pending') {
        res.status(400).json({ error: 'Stock adjustment request is not pending' });
        return;
      }

      const updatedAdjustment = await prisma.stockAdjustmentRequest.update({
        where: { id: adjustmentId },
        data: {
          status,
          approvedBy: userId,
          approvedAt: new Date(),
          notes: notes || stockAdjustment.notes
        }
      });

      // If approved, update the actual stock
      if (status === 'approved') {
        // Update shop inventory
        await prisma.shopInventory.upsert({
          where: {
            shopId_productId: {
              shopId: stockAdjustment.shopId,
              productId: stockAdjustment.productId
            }
          },
          update: {
            currentStock: stockAdjustment.adjustedStock
          },
          create: {
            shopId: stockAdjustment.shopId,
            productId: stockAdjustment.productId,
            currentStock: stockAdjustment.adjustedStock,
            minStockPerItem: 0,
            lowStockAlertsEnabled: true
          }
        });

        // Create stock transaction record
        await prisma.stockTransaction.create({
          data: {
            shopId: stockAdjustment.shopId,
            productId: stockAdjustment.productId,
            transactionType: 'ADJUSTMENT',
            quantity: stockAdjustment.adjustedStock - stockAdjustment.currentStock,
            unitPrice: 0, // Unit price not available in product model
            totalAmount: 0, // No monetary value for stock adjustments
            reason: stockAdjustment.customReason || stockAdjustment.reason,
            referenceId: adjustmentId,
            notes: `Stock adjustment ${status} by admin. ${notes || ''}`
          }
        });
      }

      // Notify shop owner about the decision
      if (stockAdjustment.shop.managerId) {
        await prisma.notification.create({
          data: {
            userId: stockAdjustment.shop.managerId,
            type: 'STOCK_ADJUSTMENT',
            message: `Your stock adjustment request for ${stockAdjustment.product.name} has been ${status}`
          }
        });

        emitUserNotification(stockAdjustment.shop.managerId, {
          event: 'stock_adjustment_updated',
          notification: {
            type: 'STOCK_ADJUSTMENT',
            message: `Your stock adjustment request for ${stockAdjustment.product.name} has been ${status}`,
            stockAdjustmentId: adjustmentId
          }
        });
      }

      res.json({
        success: true,
        data: updatedAdjustment
      });
    } catch (error) {
      logger.error('Error updating stock adjustment status:', error);
      res.status(500).json({ error: 'Failed to update stock adjustment status' });
    }
  }

  // Get default adjustment reasons
  static async getDefaultReasons(req: Request, res: Response): Promise<void> {
    try {
      const defaultReasons = [
        'Damage/Loss',
        'Theft',
        'Expiry',
        'Quality Control',
        'Inventory Count Discrepancy',
        'Transfer to Another Shop',
        'Return to Supplier',
        'Other'
      ];

      res.json({
        success: true,
        data: defaultReasons
      });
    } catch (error) {
      logger.error('Error fetching default reasons:', error);
      res.status(500).json({ error: 'Failed to fetch default reasons' });
    }
  }

  // Get stock adjustment details
  static async getStockAdjustmentDetails(req: Request, res: Response): Promise<void> {
    try {
      const { adjustmentId } = req.params;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stockAdjustment = await prisma.stockAdjustmentRequest.findUnique({
        where: { id: adjustmentId },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              managerId: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unitPrice: true
            }
          }
        }
      });

      if (!stockAdjustment) {
        res.status(404).json({ error: 'Stock adjustment request not found' });
        return;
      }

      // Check permissions
      const user = await prisma.user.findUnique({
        where: { publicId: userId },
        select: { role: true, managedShops: true }
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      if (user.role !== 'Admin' && !user.managedShops.some(shop => shop.id === stockAdjustment.shopId)) {
        res.status(403).json({ error: 'Access denied to this stock adjustment' });
        return;
      }

      res.json({
        success: true,
        data: stockAdjustment
      });
    } catch (error) {
      logger.error('Error fetching stock adjustment details:', error);
      res.status(500).json({ error: 'Failed to fetch stock adjustment details' });
    }
  }
}

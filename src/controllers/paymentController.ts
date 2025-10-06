import { Request, Response } from 'express';
import { prisma } from '../config/client';
import { logger } from '../utils/logger';
import { emitUserNotification } from './NotificationsController';
import { deleteFile, getFilePath, fileExists, getFileStats } from '../services/fileUploadService';

export class PaymentController {
  // Upload receipt for restock request
  static async uploadReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { restockRequestId } = req.params;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Verify the restock request belongs to the user
      const restockRequest = await prisma.restockRequest.findFirst({
        where: {
          id: restockRequestId,
          shop: {
            managerId: userId
          }
        }
      });

      if (!restockRequest) {
        // Delete the uploaded file since request doesn't exist
        await deleteFile(req.file.filename);
        res.status(404).json({ error: 'Restock request not found' });
        return;
      }

      // Update the restock request with receipt path
      const updatedRequest = await prisma.restockRequest.update({
        where: { id: restockRequestId },
        data: {
          receiptPath: req.file.filename,
          paymentStatus: 'pending_verification'
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
              sku: true
            }
          }
        }
      });

      // Notify admins about new receipt upload
      const adminUsers = await prisma.user.findMany({
        where: { role: 'Admin' },
        select: { publicId: true, name: true }
      });

      for (const admin of adminUsers) {
        await prisma.notification.create({
          data: {
            userId: admin.publicId,
            type: 'PAYMENT_VERIFICATION',
            message: `New receipt uploaded for restock request from ${updatedRequest.shop.name}`
          }
        });

        emitUserNotification(admin.publicId, {
          event: 'receipt_uploaded',
          notification: {
            type: 'PAYMENT_VERIFICATION',
            message: `New receipt uploaded for restock request from ${updatedRequest.shop.name}`,
            restockRequestId: restockRequestId
          }
        });
      }

      res.json({
        success: true,
        data: {
          restockRequestId,
          receiptPath: req.file.filename,
          paymentStatus: 'pending_verification'
        }
      });
    } catch (error) {
      logger.error('Error uploading receipt:', error);
      res.status(500).json({ error: 'Failed to upload receipt' });
    }
  }

  // Verify payment (admin only)
  static async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const { restockRequestId } = req.params;
      const { verified, notes } = req.body;
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

      const restockRequest = await prisma.restockRequest.findUnique({
        where: { id: restockRequestId },
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

      if (!restockRequest) {
        res.status(404).json({ error: 'Restock request not found' });
        return;
      }

      const paymentStatus = verified ? 'verified' : 'rejected';
      
      const updatedRequest = await prisma.restockRequest.update({
        where: { id: restockRequestId },
        data: {
          paymentStatus,
          notes: notes || restockRequest.notes
        }
      });

      // If payment is verified, update shop financials
      if (verified && restockRequest.finalAmount) {
        await prisma.shopFinancials.upsert({
          where: { shopId: restockRequest.shopId },
          update: {
            totalExpenses: {
              increment: restockRequest.finalAmount
            },
            pendingPayments: {
              decrement: restockRequest.finalAmount
            },
            lastUpdated: new Date()
          },
          create: {
            shopId: restockRequest.shopId,
            totalExpenses: restockRequest.finalAmount,
            pendingPayments: 0,
            lastUpdated: new Date()
          }
        });

        // Create stock transaction record
        await prisma.stockTransaction.create({
          data: {
            shopId: restockRequest.shopId,
            productId: restockRequest.productId,
            transactionType: 'RESTOCK',
            quantity: restockRequest.requestedAmount,
            unitPrice: Number(restockRequest.finalAmount) / Number(restockRequest.requestedAmount),
            totalAmount: restockRequest.finalAmount,
            reason: 'Restock request payment verified',
            referenceId: restockRequestId,
            notes: `Payment verified by admin. ${notes || ''}`
          }
        });
      }

      // Notify shop owner about payment verification
      if (restockRequest.shop.managerId) {
        await prisma.notification.create({
          data: {
            userId: restockRequest.shop.managerId,
            type: 'PAYMENT_VERIFICATION',
            message: `Your payment has been ${verified ? 'verified' : 'rejected'} for restock request`
          }
        });

        emitUserNotification(restockRequest.shop.managerId, {
          event: 'payment_verified',
          notification: {
            type: 'PAYMENT_VERIFICATION',
            message: `Your payment has been ${verified ? 'verified' : 'rejected'} for restock request`,
            restockRequestId: restockRequestId
          }
        });
      }

      res.json({
        success: true,
        data: updatedRequest
      });
    } catch (error) {
      logger.error('Error verifying payment:', error);
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  }

  // Get receipt file (admin only)
  static async getReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
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

      if (!fileExists(filename)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const filePath = getFilePath(filename);
      const fileStats = getFileStats(filename);

      if (!fileStats) {
        res.status(404).json({ error: 'File not accessible' });
        return;
      }

      res.download(filePath, filename, (err) => {
        if (err) {
          logger.error('Error downloading file:', err);
          res.status(500).json({ error: 'Failed to download file' });
        }
      });
    } catch (error) {
      logger.error('Error getting receipt:', error);
      res.status(500).json({ error: 'Failed to get receipt' });
    }
  }

  // Get payment verification queue (admin only)
  static async getPaymentQueue(req: Request, res: Response): Promise<void> {
    try {
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

      const paymentQueue = await prisma.restockRequest.findMany({
        where: {
          paymentStatus: 'pending_verification',
          receiptPath: { not: null }
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
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json({
        success: true,
        data: paymentQueue
      });
    } catch (error) {
      logger.error('Error getting payment queue:', error);
      res.status(500).json({ error: 'Failed to get payment queue' });
    }
  }

  // Get shop financials
  static async getShopFinancials(req: Request, res: Response): Promise<void> {
    try {
      const { shopId } = req.params;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if user has access to this shop
      const user = await prisma.user.findUnique({
        where: { publicId: userId },
        select: { role: true, managedShops: true }
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Admin can access any shop, others can only access their managed shops
      if (user.role !== 'Admin' && !user.managedShops.some(shop => shop.id === shopId)) {
        res.status(403).json({ error: 'Access denied to this shop' });
        return;
      }

      const financials = await prisma.shopFinancials.findUnique({
        where: { shopId },
        include: {
          shop: {
            select: {
              name: true,
              address: true
            }
          }
        }
      });

      if (!financials) {
        // Create default financials if they don't exist
        const newFinancials = await prisma.shopFinancials.create({
          data: {
            shopId,
            totalRevenue: 0,
            totalExpenses: 0,
            totalProfit: 0,
            pendingPayments: 0
          },
          include: {
            shop: {
              select: {
                name: true,
                address: true
              }
            }
          }
        });
        res.json({ success: true, data: newFinancials });
        return;
      }

      res.json({
        success: true,
        data: financials
      });
    } catch (error) {
      logger.error('Error getting shop financials:', error);
      res.status(500).json({ error: 'Failed to get shop financials' });
    }
  }
}

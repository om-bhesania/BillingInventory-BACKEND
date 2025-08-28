import { Request, Response, NextFunction } from 'express';
import { hasPermission, UserWithRole } from '../utils/permissions';
import { logger } from '../utils/logger';
import { AuthUser } from '../types/auth';
import { prisma } from '../config/client';

/**
 * Middleware to check if user has required permissions
 */
export function checkPermissions(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      logger.info('No user found in request', { resource, action });
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Convert AuthUser to UserWithRole for permission checking
    const userWithRole: UserWithRole = {
      ...user,
      password: '', // Add empty password as it's required by UserWithRole
      shopIds: user.shopIds || [], // Add shopIds field with default empty array
    } as UserWithRole;

    if (hasPermission(userWithRole, resource, action)) {
      next();
    } else {
      logger.warn('Permission denied', { 
        userId: user.id,
        resource,
        action,
        userRole: user.Role?.name
      });
      return res.status(403).json({ 
        message: 'Forbidden',
        detail: `You don't have permission to ${action} ${resource}`
      });
    }
  };
}

/**
 * Middleware to check if user owns or manages the shop
 */
export function checkShopAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthUser | undefined;
    const shopId = req.params.shopId || req.body.shopId;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Admin can access all shops
    if (user.Role?.name === 'Admin') {
      return next();
    }

    // Check if user manages this shop by querying directly
    const managedShop = await prisma.shop.findFirst({
      where: { 
        id: shopId,
        managerId: user.publicId 
      },
    });

    if (managedShop) {
      return next();
    }

    logger.warn('Shop access denied', { 
      userId: user.id,
      shopId,
      userRole: user.Role?.name
    });
    
    return res.status(403).json({ 
      message: 'Forbidden',
      detail: 'You can only access shops you own or manage'
    });
  };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermissions = checkPermissions;
exports.checkShopAccess = checkShopAccess;
const permissions_1 = require("../utils/permissions");
const logger_1 = require("../utils/logger");
const client_1 = require("../config/client");
/**
 * Middleware to check if user has required permissions
 */
function checkPermissions(resource, action) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            logger_1.logger.info('No user found in request', { resource, action });
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Convert AuthUser to UserWithRole for permission checking
        const userWithRole = {
            ...user,
            password: '', // Add empty password as it's required by UserWithRole
            shopIds: user.shopIds || [], // Add shopIds field with default empty array
        };
        if ((0, permissions_1.hasPermission)(userWithRole, resource, action)) {
            next();
        }
        else {
            logger_1.logger.warn('Permission denied', {
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
function checkShopAccess() {
    return async (req, res, next) => {
        const user = req.user;
        const shopId = req.params.shopId || req.body.shopId;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Admin can access all shops
        if (user.Role?.name === 'Admin') {
            return next();
        }
        // Check if user manages this shop by querying directly
        const managedShop = await client_1.prisma.shop.findFirst({
            where: {
                id: shopId,
                managerId: user.publicId
            },
        });
        if (managedShop) {
            return next();
        }
        logger_1.logger.warn('Shop access denied', {
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

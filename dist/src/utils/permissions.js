"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROUTE_PERMISSIONS = exports.DEFAULT_ROLE_PERMISSIONS = void 0;
exports.createPermissionMap = createPermissionMap;
exports.hasPermission = hasPermission;
exports.checkAccess = checkAccess;
exports.getRolePermissions = getRolePermissions;
/**
 * Convert role permissions to a flat permission map
 */
function createPermissionMap(user) {
    if (!user.Role?.permissions) {
        return {};
    }
    return user.Role.permissions.reduce((acc, rolePerm) => {
        const { action, resource } = rolePerm.permission;
        acc[`${resource}:${action}`] = true;
        return acc;
    }, {});
}
/**
 * Default permissions for each role
 */
exports.DEFAULT_ROLE_PERMISSIONS = {
    'Admin': ['*:*'],
    'Shop Owner': [
        'inventory:read',
        'inventory:write',
        'inventory:update',
        'inventory:delete',
        'shop:read',
        'shop:write',
        'shop:update',
        'invoice:read',
        'invoice:write',
        'invoice:update',
    ],
    'Shop Manager': [
        'inventory:read',
        'inventory:write',
        'shop:read',
        'invoice:read',
        'invoice:write',
    ]
};
/**
 * Check if a user has permission for a specific action on a resource
 */
function hasPermission(user, resource, action) {
    if (!user.Role) {
        return false;
    }
    // Admin has all permissions
    if (user.Role.name === 'Admin') {
        return true;
    }
    const permissionMap = createPermissionMap(user);
    return !!permissionMap[`${resource}:${action}`];
}
/**
 * Check if a user has access to specific routes/features
 */
function checkAccess(user, requiredPermissions) {
    if (!user.Role) {
        return false;
    }
    // Admin has all permissions
    if (user.Role.name === 'Admin') {
        return true;
    }
    const permissionMap = createPermissionMap(user);
    return requiredPermissions.every(permission => !!permissionMap[permission]);
}
/**
 * Get all permissions for a role
 */
function getRolePermissions(roleName) {
    return exports.DEFAULT_ROLE_PERMISSIONS[roleName] || [];
}
/**
 * Map route to required permissions
 */
exports.ROUTE_PERMISSIONS = {
    '/inventory': ['inventory:read'],
    '/inventory/add': ['inventory:write'],
    '/inventory/edit': ['inventory:update'],
    '/invoices': ['invoice:read'],
    '/invoices/add': ['invoice:write'],
    '/invoices/edit': ['invoice:update'],
    '/shops': ['shop:read'],
    '/shops/add': ['shop:write'],
    '/shops/edit': ['shop:update'],
    '/employees': ['employee:read'],
    '/employees/add': ['employee:write'],
    '/employees/edit': ['employee:update'],
};

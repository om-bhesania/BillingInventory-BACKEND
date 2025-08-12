import { Role, User } from '@prisma/client';

export interface UserWithRole extends User {
  Role?: Role & {
    permissions: {
      permission: {
        action: string;
        resource: string;
        description?: string;
      };
    }[];
  };
}

export interface PermissionMap {
  [key: string]: boolean;
}

/**
 * Convert role permissions to a flat permission map
 */
export function createPermissionMap(user: UserWithRole): PermissionMap {
  if (!user.Role?.permissions) {
    return {};
  }

  return user.Role.permissions.reduce((acc: PermissionMap, rolePerm) => {
    const { action, resource } = rolePerm.permission;
    acc[`${resource}:${action}`] = true;
    return acc;
  }, {});
}

/**
 * Default permissions for each role
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
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
export function hasPermission(
  user: UserWithRole,
  resource: string,
  action: string
): boolean {
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
export function checkAccess(
  user: UserWithRole,
  requiredPermissions: string[]
): boolean {
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
export function getRolePermissions(roleName: string): string[] {
  return DEFAULT_ROLE_PERMISSIONS[roleName] || [];
}

/**
 * Map route to required permissions
 */
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
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

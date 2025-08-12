import { Prisma } from '@prisma/client';

export interface Permission {
  id: string;
  action: string;
  resource: string;
  description: string | null;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permission: Permission;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  permissions: RolePermission[];
  permissionMap: Record<string, boolean>;
}

// User with relations
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    Role: {
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    }
    ownedShop: {
      select: {
        id: true;
        name: true;
        email: true;
        description: true;
        location: true;
        contactNumber: true;
        isActive: true;
        openingDate: true;
        maxCapacity: true;
        createdAt: true;
        updatedAt: true;
        ownerId: true;
        managerId: true;
      }
    }
    managedShop: true
  }
}> & {
  Role?: RoleWithPermissions;
};

// Role with relations
export type RoleWithRelations = Prisma.RoleGetPayload<{
  include: {
    permissions: {
      include: {
        permission: true
      }
    }
    users: true
  }
}>;

// Shop with relations
export type ShopWithRelations = Prisma.ShopGetPayload<{
  include: {
    owner: true
    manager: true
    inventory: {
      include: {
        product: true
      }
    }
    restockRequests: {
      include: {
        product: true
      }
    }
  }
}>;

// Product with relations
export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true
    flavor: true
    shopInventory: {
      include: {
        shop: true
      }
    }
    RestockRequest: {
      include: {
        shop: true
      }
    }
  }
}>;

// Request with user
export interface AuthenticatedRequest extends Request {
  user?: UserWithRelations;
}

// Permission map type
export type PermissionMap = {
  [key: string]: boolean;
};

// API Error type
export interface ApiError extends Error {
  status?: number;
  code?: string;
}

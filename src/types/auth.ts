import { User, Role, Shop } from '@prisma/client';

export interface AuthUser extends User {
  Role?: Role & {
    permissions: Array<{
      permission: {
        action: string;
        resource: string;
        description?: string;
      };
    }>;
  };
  ownedShop?: Shop;
  managedShop?: Shop;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        role: string;
        roleId: string;
        email: string;
        contact: string;
        ownedShop?: Shop;
      };
    }
  }
}

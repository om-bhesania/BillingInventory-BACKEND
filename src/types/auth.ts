import { User, Role, Shop } from '@prisma/client';

export interface AuthenticatedUser {
  id: number;
  publicId: string;
  name: string | null;
  email: string | null;
  role: string | null;
  roleId: string | null;
  contact: string | null;
  shopIds: string[];
  managedShops: Shop[];
  Role?: Role;
}

// Export AuthUser as an alias for AuthenticatedUser for backward compatibility
export type AuthUser = AuthenticatedUser;

// Express Request interface extension is handled in middlewares/ErrorHandlers/checkAccess.ts

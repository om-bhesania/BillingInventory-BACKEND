// Type definitions for the application
import { User, Role, Permission, Shop } from '@prisma/client';

// Base interfaces extending Prisma types
export interface BaseUser extends User {
  Role?: BaseRole;
  ownedShop?: Shop;
  managedShop?: Shop;
}

export interface BaseRole extends Role {
  permissions: RolePermission[];
}

export interface BasePermission extends Permission {
  roles: RolePermission[];
}

// Permission mapping
export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permission: Permission;
}

export interface RoleWithPermissions extends BaseRole {
  permissionMap: Record<string, boolean>;
}

// Request types
export interface AuthRequest extends Request {
  user?: BaseUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Response types
export interface LoginResponse {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    role: string;
    permissions: Record<string, boolean>;
    ownedShop?: Shop | null;
    managedShop?: Shop | null;
  };
  accessToken: string;
}

// Error types
export interface ApiError extends Error {
  status?: number;
  code?: string;
}

// Token payload
export interface TokenPayload {
  id: number;
  name: string | null;
  role: string;
  roleId: string | null;
  email: string | null;
  contact: string | null;
  permissions: Record<string, boolean>;
}

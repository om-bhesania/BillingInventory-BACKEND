import { PrismaClient } from '@prisma/client';
import { BaseUser, RoleWithPermissions, BaseRole } from '../types';
import { createError } from '../middlewares/ErrorHandlers/errorHandler';

const prisma = new PrismaClient();

export class DatabaseService {
  static async findUserByEmail(email: string): Promise<BaseUser> {
    const user = await prisma.user.findFirst({
      where: { email },
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
      }
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get shops where this user is the manager
    const managedShops = await prisma.shop.findMany({
      where: { managerId: user.publicId },
    });

    // Transform the Role and Shop properties to match BaseUser type
    const transformedUser: BaseUser = {
      ...user,
      Role: user.Role ? {
        ...user.Role,
        permissions: user.Role.permissions.map((p: any) => ({
          id: p.id,
          roleId: p.roleId,
          permissionId: p.permissionId,
          permission: p.permission
        }))
      } : undefined,
      managedShops: managedShops || []
    };

    return transformedUser;
  }

  static async findUserById(id: number): Promise<BaseUser> {
    const user = await prisma.user.findUnique({
      where: { id },
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
      }
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get shops where this user is the manager
    const managedShops = await prisma.shop.findMany({
      where: { managerId: user.publicId },
    });

    // Transform the Role and Shop properties to match BaseUser type
    const transformedUser: BaseUser = {
      ...user,
      Role: user.Role ? {
        ...user.Role,
        permissions: user.Role.permissions.map((p: any) => ({
          id: p.id,
          roleId: p.roleId,
          permissionId: p.permissionId,
          permission: p.permission
        }))
      } : undefined,
      managedShops: managedShops || []
    };

    return transformedUser;
  }

  static createRoleWithPermissions(user: BaseUser): RoleWithPermissions {
    if (!user.Role) {
      throw createError('User role not found', 500, 'ROLE_NOT_FOUND');
    }

    return {
      ...user.Role,
      permissionMap: user.Role.permissions.reduce((acc: Record<string, boolean>, rolePerm) => {
        const { action, resource } = rolePerm.permission;
        acc[`${resource}:${action}`] = true;
        return acc;
      }, {})
    };
  }
}

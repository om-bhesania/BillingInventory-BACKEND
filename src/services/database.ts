import { Prisma, PrismaClient } from '@prisma/client';
import { createError } from '../middlewares/ErrorHandlers/errorHandler';
import { UserWithRelations, ShopWithRelations } from '../types/models';

const prisma = new PrismaClient();

export class DatabaseService {
  static async findUserById(id: number): Promise<UserWithRelations> {
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
        },
        ownedShop: true,
        managedShop: true
      }
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  static async findUserByEmail(email: string): Promise<UserWithRelations> {
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
        },
        ownedShop: true,
        managedShop: true
      }
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  static async findShopById(id: string): Promise<ShopWithRelations> {
    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        owner: true,
        manager: true,
        inventory: {
          include: {
            product: true
          }
        },
        restockRequests: {
          include: {
            product: true
          }
        }
      }
    });

    if (!shop) {
      throw createError('Shop not found', 404, 'SHOP_NOT_FOUND');
    }

    return shop;
  }

  static async createShop(data: Prisma.ShopCreateInput): Promise<ShopWithRelations> {
    return await prisma.shop.create({
      data,
      include: {
        owner: true,
        manager: true,
        inventory: {
          include: {
            product: true
          }
        },
        restockRequests: {
          include: {
            product: true
          }
        }
      }
    });
  }

  static async updateShop(
    id: string,
    data: Prisma.ShopUpdateInput
  ): Promise<ShopWithRelations> {
    return await prisma.shop.update({
      where: { id },
      data,
      include: {
        owner: true,
        manager: true,
        inventory: {
          include: {
            product: true
          }
        },
        restockRequests: {
          include: {
            product: true
          }
        }
      }
    });
  }

  static async deleteShop(id: string): Promise<void> {
    await prisma.shop.delete({
      where: { id }
    });
  }
}

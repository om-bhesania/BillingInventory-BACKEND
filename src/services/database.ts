import { Prisma, PrismaClient } from "@prisma/client";
import { createError } from "../middlewares/ErrorHandlers/errorHandler";
import { UserWithRelations, ShopWithRelations } from "../types/models";

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
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw createError("User not found", 404, "USER_NOT_FOUND");
    }

    // Get shops where this user is the manager
    const managedShops = await prisma.shop.findMany({
      where: { managerId: user.publicId },
      select: {
        id: true,
        name: true,
        email: true,
        description: true,
        contactNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        managerId: true,
      },
    });

    // @ts-ignore
    return { ...user, managedShops };
  }

  static async findUserByEmail(email: string): Promise<UserWithRelations> {
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        Role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw createError("User not found", 404, "USER_NOT_FOUND");
    }

    // Get shops where this user is the manager
    const managedShops = await prisma.shop.findMany({
      where: { managerId: user.publicId },
    });

    // @ts-ignore
    return { ...user, managedShops };
  }

  static async findShopById(id: string): Promise<ShopWithRelations> {
    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        manager: true,
        inventory: {
          include: {
            product: true,
          },
        },
        restockRequests: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!shop) {
      throw createError("Shop not found", 404, "SHOP_NOT_FOUND");
    }

    return shop;
  }

  static async createShop(
    data: Prisma.ShopCreateInput
  ): Promise<ShopWithRelations> {
    return await prisma.shop.create({
      data,
      include: {
        manager: true,
        inventory: {
          include: {
            product: true,
          },
        },
        restockRequests: {
          include: {
            product: true,
          },
        },
      },
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
        manager: true,
        inventory: {
          include: {
            product: true,
          },
        },
        restockRequests: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  static async deleteShop(id: string): Promise<void> {
    await prisma.shop.delete({
      where: { id },
    });
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const client_1 = require("@prisma/client");
const errorHandler_1 = require("../middlewares/ErrorHandlers/errorHandler");
const prisma = new client_1.PrismaClient();
class DatabaseService {
    static async findUserById(id) {
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
            throw (0, errorHandler_1.createError)("User not found", 404, "USER_NOT_FOUND");
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
    static async findUserByEmail(email) {
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
            throw (0, errorHandler_1.createError)("User not found", 404, "USER_NOT_FOUND");
        }
        // Get shops where this user is the manager
        const managedShops = await prisma.shop.findMany({
            where: { managerId: user.publicId },
        });
        // @ts-ignore
        return { ...user, managedShops };
    }
    static async findShopById(id) {
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
            throw (0, errorHandler_1.createError)("Shop not found", 404, "SHOP_NOT_FOUND");
        }
        return shop;
    }
    static async createShop(data) {
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
    static async updateShop(id, data) {
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
    static async deleteShop(id) {
        await prisma.shop.delete({
            where: { id },
        });
    }
}
exports.DatabaseService = DatabaseService;

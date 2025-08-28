"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const client_1 = require("@prisma/client");
const errorHandler_1 = require("../middlewares/ErrorHandlers/errorHandler");
const prisma = new client_1.PrismaClient();
class DatabaseService {
    static async findUserByEmail(email) {
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
            throw (0, errorHandler_1.createError)('User not found', 404, 'USER_NOT_FOUND');
        }
        // Get shops where this user is the manager
        const managedShops = await prisma.shop.findMany({
            where: { managerId: user.publicId },
        });
        // Transform the Role and Shop properties to match BaseUser type
        const transformedUser = {
            ...user,
            Role: user.Role ? {
                ...user.Role,
                permissions: user.Role.permissions.map((p) => ({
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
    static async findUserById(id) {
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
            throw (0, errorHandler_1.createError)('User not found', 404, 'USER_NOT_FOUND');
        }
        // Get shops where this user is the manager
        const managedShops = await prisma.shop.findMany({
            where: { managerId: user.publicId },
        });
        // Transform the Role and Shop properties to match BaseUser type
        const transformedUser = {
            ...user,
            Role: user.Role ? {
                ...user.Role,
                permissions: user.Role.permissions.map((p) => ({
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
    static createRoleWithPermissions(user) {
        if (!user.Role) {
            throw (0, errorHandler_1.createError)('User role not found', 500, 'ROLE_NOT_FOUND');
        }
        return {
            ...user.Role,
            permissionMap: user.Role.permissions.reduce((acc, rolePerm) => {
                const { action, resource } = rolePerm.permission;
                acc[`${resource}:${action}`] = true;
                return acc;
            }, {})
        };
    }
}
exports.DatabaseService = DatabaseService;

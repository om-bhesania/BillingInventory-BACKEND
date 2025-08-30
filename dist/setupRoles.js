"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const modules_1 = require("./src/types/modules");
const prisma = new client_1.PrismaClient();
async function setupRoles() {
    try {
        // Upsert Admin role
        const adminRole = await prisma.role.upsert({
            where: { name: "Admin" },
            update: {
                description: "Administrator role with full system access",
            },
            create: {
                name: "Admin",
                description: "Administrator role with full system access",
            },
        });
        // Upsert Shop Owner role
        const shopOwnerRole = await prisma.role.upsert({
            where: { name: "Shop_Owner" },
            update: {
                description: "Shop owner with permissions to manage their store and products",
            },
            create: {
                name: "Shop_Owner",
                description: "Shop owner with permissions to manage their store and products",
            },
        });
        // Delete existing permissions for these roles
        await prisma.rolePermission.deleteMany({
            where: {
                roleId: {
                    in: [adminRole.id, shopOwnerRole.id],
                },
            },
        });
        // Create permissions for Admin
        const adminModules = Object.keys(modules_1.DEFAULT_PERMISSIONS.Admin);
        for (const module of adminModules) {
            const actions = modules_1.DEFAULT_PERMISSIONS.Admin[module];
            const permissions = actions.map((action) => ({
                action,
                resource: module,
                description: `${action} ${module}`,
            }));
            // Create permissions using upsert to handle duplicates
            for (const permission of permissions) {
                await prisma.permission.upsert({
                    where: {
                        action_resource: {
                            action: permission.action,
                            resource: permission.resource,
                        },
                    },
                    update: {},
                    create: permission,
                });
            }
            // Fetch created permissions
            const createdPermissionRecords = await prisma.permission.findMany({
                where: {
                    resource: module,
                    action: { in: actions },
                },
            });
            // Create role-permission connections
            await prisma.rolePermission.createMany({
                data: createdPermissionRecords.map((permission) => ({
                    roleId: adminRole.id,
                    permissionId: permission.id,
                })),
            });
        }
        // Create permissions for Shop Owner
        const shopOwnerModules = Object.keys(modules_1.DEFAULT_PERMISSIONS.Shop_Owner);
        for (const module of shopOwnerModules) {
            const actions = modules_1.DEFAULT_PERMISSIONS.Shop_Owner[module];
            const permissions = actions.map((action) => ({
                action,
                resource: module,
                description: `${action} ${module}`,
            }));
            // Create permissions using upsert to handle duplicates
            for (const permission of permissions) {
                await prisma.permission.upsert({
                    where: {
                        action_resource: {
                            action: permission.action,
                            resource: permission.resource,
                        },
                    },
                    update: {},
                    create: permission,
                });
            }
            // Fetch created permissions
            const createdPermissionRecords = await prisma.permission.findMany({
                where: {
                    resource: module,
                    action: { in: actions },
                },
            });
            // Create role-permission connections
            await prisma.rolePermission.createMany({
                data: createdPermissionRecords.map((permission) => ({
                    roleId: shopOwnerRole.id,
                    permissionId: permission.id,
                })),
            });
        }
        console.log("Roles and permissions set up successfully!");
    }
    catch (error) {
        console.error('Error setting up roles:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
setupRoles();

import { PrismaClient } from '@prisma/client';
import { DEFAULT_PERMISSIONS, ModuleName } from './src/types/modules';

const prisma = new PrismaClient();

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
    const adminModules = Object.keys(DEFAULT_PERMISSIONS.Admin) as ModuleName[];
    for (const module of adminModules) {
      const actions = DEFAULT_PERMISSIONS.Admin[module];
      const permissions = actions.map((action: any) => ({
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
    const shopOwnerModules = Object.keys(DEFAULT_PERMISSIONS.Shop_Owner) as ModuleName[];
    for (const module of shopOwnerModules) {
      const actions = DEFAULT_PERMISSIONS.Shop_Owner[module];
      const permissions = actions.map((action: any) => ({
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
  } catch (error) {
    console.error('Error setting up roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupRoles();


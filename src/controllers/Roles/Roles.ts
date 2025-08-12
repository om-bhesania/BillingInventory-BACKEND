import { Request, Response } from "express";
import { prisma } from "../../config/client";
import {
  DEFAULT_PERMISSIONS,
  ModuleName,
  ActionType,
  SYSTEM_MODULES,
} from "../../types/modules";
import { greenBright, yellowBG } from "console-log-colors";

// Type definitions for Prisma relations - matching actual Prisma schema
interface User {
  id: number;
  name: string | null;
  role: string | null;
  roleId: string | null;
  email: string | null;
  contact: string | null;
}

interface Permission {
  id: string;
  action: string;
  resource: string;
  description: string | null;
}

interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permission: Permission;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  users: User[];
  permissions: RolePermission[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface TransformedRole {
  id: string;
  name: string;
  description: string | null;
  users: User[];
  permissions: Array<{
    module: string;
    actions: string[];
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CreateRoleRequest {
  name: string;
  description?: string;
  modules?: ModuleName[];
  customPermissions?: Record<ModuleName, ActionType[]>;
}

interface UpdateRolePermissionsRequest {
  modules: Record<ModuleName, ActionType[]>;
}

// Utility function to validate actions
const validateActions = (actions: string[]): ActionType[] => {
  const validActions: ActionType[] = ["read", "write", "update", "delete"];
  return actions.filter((action) =>
    validActions.includes(action as ActionType)
  ) as ActionType[];
};

// Utility function to get permissions for a role
const getRolePermissions = (
  roleName: string,
  customModules?: ModuleName[],
  customPermissions?: Record<ModuleName, ActionType[]>
): Record<ModuleName, ActionType[]> => {
  // First check if we have custom permissions
  if (customPermissions) {
    return customPermissions;
  }

  // Then check for default permissions by role name
  const defaultPerms =
    DEFAULT_PERMISSIONS[roleName] ||
    DEFAULT_PERMISSIONS[roleName.replace(/\s+/g, "_")];
  if (defaultPerms) {
    return defaultPerms;
  }

  // If custom modules are provided without permissions, give read access only
  if (customModules) {
    return Object.fromEntries(
      customModules.map((module) => [module, ["read"] as ActionType[]])
    ) as Record<ModuleName, ActionType[]>;
  }

  // Default fallback - minimal permissions
  return {
    Home: ["read"],
  } as Record<ModuleName, ActionType[]>;
};

// CREATE
const createRole = async (req: Request, res: Response): Promise<void> => {
  const { name, description, modules, customPermissions }: CreateRoleRequest =
    req.body || {};

  if (!name?.trim()) {
    res.status(400).json({ message: "Name is required and cannot be empty" });
    return;
  }

  try {
    // Get permissions for this role
    const rolePermissions = getRolePermissions(
      name,
      modules,
      customPermissions
    );

    console.log(
      `Creating role "${name}" with permissions:`,
      greenBright(JSON.stringify(rolePermissions, null, 2))
    );

    // First create the role
    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    // Then create permissions for each module
    const permissionPromises = Object.entries(rolePermissions).map(
      async ([module, actions]) => {
        const validActions = validateActions(actions);

        if (validActions.length === 0) {
          console.log(`No valid actions for module ${module}, skipping...`);
          return;
        }

        // Create permission records if they don't exist
        const permissions = validActions.map((action: ActionType) => ({
          action,
          resource: module,
          description: `${action} access to ${module} module`,
        }));

        await prisma.permission.createMany({
          data: permissions,
          skipDuplicates: true,
        });

        // Get the created/existing permissions
        const createdPermissionRecords = await prisma.permission.findMany({
          where: {
            resource: module,
            action: { in: validActions },
          },
        });

        // Create role-permission relationships
        const rolePermissions = createdPermissionRecords.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        }));

        await prisma.rolePermission.createMany({
          data: rolePermissions,
          skipDuplicates: true,
        });

        console.log(
          `Added ${validActions.length} permissions for ${module} to role ${name}`
        );
      }
    );

    await Promise.all(permissionPromises);

    // Fetch the created role with its permissions
    const roleWithPermissions = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            role: true,
            roleId: true,
            email: true,
            contact: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    console.log(`Successfully created role: ${name}`, greenBright("✓"));
    res.status(201).json(roleWithPermissions);
  } catch (error: any) {
    console.error("Error creating role:", error);
    if (error.code === "P2002") {
      res.status(400).json({ message: "Role with this name already exists" });
      return;
    }
    res
      .status(500)
      .json({ message: "Failed to create role", error: error.message });
  }
};

// READ ALL
const getAllRoles = async (req: Request, res: Response): Promise<void> => {
  console.log("Fetching all roles...");

  try {
    const roles = (await prisma.role.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            role: true,
            roleId: true,
            email: true,
            contact: true, 
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      }, 
    })) as Role[];

    console.log(`Found ${roles.length} roles`, yellowBG("INFO"));

    // Transform the roles to group permissions by module
    const transformedRoles: TransformedRole[] = roles.map((role: Role) => {
      // Initialize permissions map for all system modules
      const modulePermissionsMap = Object.fromEntries(
        SYSTEM_MODULES.map((module) => [module, [] as ActionType[]])
      ) as Record<ModuleName, ActionType[]>;

      // Group permissions by module
      role.permissions.forEach((rolePermission: RolePermission) => {
        const { resource, action } = rolePermission.permission;

        // Validate that the resource is a known system module and action is valid
        if (
          (SYSTEM_MODULES as string[]).includes(resource) &&
          (["read", "write", "update", "delete"] as string[]).includes(action)
        ) {
          const module = resource as ModuleName;
          const validAction = action as ActionType;

          if (!modulePermissionsMap[module].includes(validAction)) {
            modulePermissionsMap[module].push(validAction);
          }
        } else {
          console.warn(
            `Invalid permission found: ${action} on ${resource} for role ${role.name}`
          );
        }
      });

      // Convert map into the expected array format, only including modules with permissions
      const permissionsArray = SYSTEM_MODULES.map((module) => ({
        module,
        actions: modulePermissionsMap[module].sort(), // Sort actions for consistency
      }));

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        users: role.users,
        permissions: permissionsArray,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      };
    });

    console.log(
      `Successfully transformed ${transformedRoles.length} roles`,
      greenBright("✓")
    );
    res.status(200).json(transformedRoles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ message: "Failed to fetch roles" });
  }
};

// READ ONE
const getRoleById = async (req: Request, res: Response): Promise<void> => {
  const { id }: { id: string } = req.params as { id: string };

  if (!id?.trim()) {
    res.status(400).json({ message: "Role ID is required" });
    return;
  }

  try {
    const role = await prisma.role.findUnique({
      where: { id: id.trim() },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            role: true,
            roleId: true,
            email: true,
            contact: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      res.status(404).json({ message: "Role not found" });
      return;
    }

    console.log(`Found role: ${role.name}`, greenBright("✓"));
    res.status(200).json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    res.status(500).json({ message: "Failed to fetch role" });
  }
};

// UPDATE ROLE BASIC INFO
const updateRole = async (req: Request, res: Response): Promise<void> => {
  const { id }: { id: string } = req.params as { id: string };
  const { name, description }: { name?: string; description?: string } =
    req.body || {};

  if (!id?.trim()) {
    res.status(400).json({ message: "Role ID is required" });
    return;
  }

  if (!name?.trim()) {
    res.status(400).json({ message: "Name is required and cannot be empty" });
    return;
  }

  try {
    const updated = await prisma.role.update({
      where: { id: id.trim() },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
      include: {
        users: true,
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    console.log(`Successfully updated role: ${updated.name}`, greenBright("✓"));
    res.status(200).json(updated);
  } catch (error: any) {
    console.error("Error updating role:", error);
    if (error.code === "P2025") {
      res.status(404).json({ message: "Role not found" });
      return;
    }
    if (error.code === "P2002") {
      res.status(400).json({ message: "Role with this name already exists" });
      return;
    }
    res.status(500).json({ message: "Failed to update role" });
  }
};

// UPDATE ROLE PERMISSIONS
const updateRolePermissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id }: { id: string } = req.params as { id: string };
  const { modules }: UpdateRolePermissionsRequest = req.body || {};

  if (!id?.trim()) {
    res.status(400).json({ message: "Role ID is required" });
    return;
  }

  if (!modules || typeof modules !== "object") {
    res.status(400).json({ message: "Modules configuration is required" });
    return;
  }

  try {
    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: id.trim() },
    });

    if (!role) {
      res.status(404).json({ message: "Role not found" });
      return;
    }

    // Start a transaction to update permissions
    await prisma.$transaction(async (tx) => {
      // Remove existing role permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id.trim() },
      });

      // Add new permissions
      const permissionPromises = Object.entries(modules).map(
        async ([module, actions]) => {
          const validActions = validateActions(actions);

          if (validActions.length === 0) {
            console.log(`No valid actions for module ${module}, skipping...`);
            return;
          }

          // Ensure permissions exist
          const permissions = validActions.map((action: ActionType) => ({
            action,
            resource: module,
            description: `${action} access to ${module} module`,
          }));

          await tx.permission.createMany({
            data: permissions,
            skipDuplicates: true,
          });

          // Get permission records
          const permissionRecords = await tx.permission.findMany({
            where: {
              resource: module,
              action: { in: validActions },
            },
          });

          // Create role-permission relationships
          const rolePermissions = permissionRecords.map((permission) => ({
            roleId: id.trim(),
            permissionId: permission.id,
          }));

          await tx.rolePermission.createMany({
            data: rolePermissions,
          });

          console.log(
            `Updated ${validActions.length} permissions for ${module}`
          );
        }
      );

      await Promise.all(permissionPromises);
    });

    // Fetch updated role
    const updatedRole = await prisma.role.findUnique({
      where: { id: id.trim() },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            role: true,
            roleId: true,
            email: true,
            contact: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    console.log(
      `Successfully updated permissions for role: ${role.name}`,
      greenBright("✓")
    );
    res.status(200).json(updatedRole);
  } catch (error: any) {
    console.error("Error updating role permissions:", error);
    res.status(500).json({ message: "Failed to update role permissions" });
  }
};

// DELETE
const deleteRole = async (req: Request, res: Response): Promise<void> => {
  const { id }: { id: string } = req.params as { id: string };

  if (!id?.trim()) {
    res.status(400).json({ message: "Role ID is required" });
    return;
  }

  try {
    // Check if role has users assigned
    const roleWithUsers = await prisma.role.findUnique({
      where: { id: id.trim() },
      include: {
        users: true,
      },
    });

    if (!roleWithUsers) {
      res.status(404).json({ message: "Role not found" });
      return;
    }

    if (roleWithUsers.users.length > 0) {
      res.status(400).json({
        message: "Cannot delete role with assigned users",
        assignedUsers: roleWithUsers.users.length,
      });
      return;
    }

    // Delete role (cascade will handle role permissions)
    await prisma.role.delete({
      where: { id: id.trim() },
    });

    console.log(
      `Successfully deleted role: ${roleWithUsers.name}`,
      greenBright("✓")
    );
    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    if (error.code === "P2025") {
      res.status(404).json({ message: "Role not found" });
      return;
    }
    res.status(500).json({ message: "Failed to delete role" });
  }
};

// GET AVAILABLE PERMISSIONS (utility endpoint)
const getAvailablePermissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const availablePermissions = SYSTEM_MODULES.map((module) => ({
      module,
      availableActions: ["read", "write", "update", "delete"] as ActionType[],
    }));

    res.status(200).json({
      modules: availablePermissions,
      defaultRoles: Object.keys(DEFAULT_PERMISSIONS),
    });
  } catch (error) {
    console.error("Error fetching available permissions:", error);
    res.status(500).json({ message: "Failed to fetch available permissions" });
  }
};

export {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  updateRolePermissions,
  deleteRole,
  getAvailablePermissions,
};

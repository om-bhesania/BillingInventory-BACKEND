import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ===============================
// PERMISSION CONTROLLER
// ===============================

// Create a new permission
export const createPermission = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { action, resource, description } = req.body;

    // Validate required fields
    if (!action) {
      return res.status(400).json({ error: "Action is required" });
    }

    if (!resource) {
      return res.status(400).json({ error: "Resource is required" });
    }

    // Check if permission with same action and resource already exists
    const existingPermission = await prisma.permission.findFirst({
      where: {
        AND: [
          { action: action.toLowerCase() },
          { resource: resource.toLowerCase() },
        ],
      },
    });

    if (existingPermission) {
      return res.status(409).json({
        error:
          "Permission with this action and resource combination already exists",
      });
    }

    const permission = await prisma.permission.create({
      data: {
        action: action.toLowerCase(),
        resource: resource.toLowerCase(),
        description,
      },
    });

    return res.status(201).json(permission);
  } catch (error) {
    console.error("Error creating permission:", error);
    return res.status(500).json({ error: "Failed to create permission" });
  }
};

// Get all permissions
export const getAllPermissions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { action, resource } = req.query;

    const where: any = {};
    if (action) {
      where.action = action as string;
    }
    if (resource) {
      where.resource = resource as string;
    }

    const permissions = await prisma.permission.findMany({
      where,
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    });

    return res.status(200).json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return res.status(500).json({ error: "Failed to fetch permissions" });
  }
};

// Get permission by ID
export const getPermissionById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!permission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    return res.status(200).json(permission);
  } catch (error) {
    console.error("Error fetching permission:", error);
    return res.status(500).json({ error: "Failed to fetch permission" });
  }
};

// Update permission
export const updatePermission = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { action, resource, description } = req.body;

    const existingPermission = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existingPermission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    // Check for duplicate if action or resource is being changed
    if (action || resource) {
      const newAction = action
        ? action.toLowerCase()
        : existingPermission.action;
      const newResource = resource
        ? resource.toLowerCase()
        : existingPermission.resource;

      const duplicate = await prisma.permission.findFirst({
        where: {
          AND: [
            { action: newAction },
            { resource: newResource },
            { NOT: { id } },
          ],
        },
      });

      if (duplicate) {
        return res.status(409).json({
          error:
            "Permission with this action and resource combination already exists",
        });
      }
    }

    const updatedPermission = await prisma.permission.update({
      where: { id },
      data: {
        action: action ? action.toLowerCase() : undefined,
        resource: resource ? resource.toLowerCase() : undefined,
        description,
      },
    });

    return res.status(200).json(updatedPermission);
  } catch (error) {
    console.error("Error updating permission:", error);
    return res.status(500).json({ error: "Failed to update permission" });
  }
};

// Delete permission
export const deletePermission = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    const existingPermission = await prisma.permission.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
    });

    if (!existingPermission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    if (existingPermission._count.roles > 0) {
      return res.status(400).json({
        error: "Cannot delete permission that is assigned to roles",
      });
    }

    await prisma.permission.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Permission deleted successfully" });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return res.status(500).json({ error: "Failed to delete permission" });
  }
};

// ===============================
// ROLE PERMISSION CONTROLLER
// ===============================

// Assign permissions to role
export const assignPermissionsToRole = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Permission IDs array is required" });
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Check if all permissions exist
    const permissions = await prisma.permission.findMany({
      where: {
        id: {
          in: permissionIds,
        },
      },
    });

    if (permissions.length !== permissionIds.length) {
      return res
        .status(404)
        .json({ error: "One or more permissions not found" });
    }

    // Remove existing permissions for this role
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Create new role permissions
    const rolePermissions = await Promise.all(
      permissionIds.map((permissionId: string) =>
        prisma.rolePermission.create({
          data: {
            roleId,
            permissionId,
          },
          include: {
            permission: true,
          },
        })
      )
    );

    return res.status(200).json({
      message: "Permissions assigned to role successfully",
      roleId,
      roleName: role.name,
      assignedPermissions: rolePermissions,
    });
  } catch (error) {
    console.error("Error assigning permissions to role:", error);
    return res
      .status(500)
      .json({ error: "Failed to assign permissions to role" });
  }
};

// Get role permissions
export const getRolePermissions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { roleId } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    return res.status(200).json({
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
      },
      permissions: role.permissions.map((rp) => rp.permission),
    });
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return res.status(500).json({ error: "Failed to fetch role permissions" });
  }
};

// Remove permission from role
export const removePermissionFromRole = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { roleId, permissionId } = req.params;

    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
        permission: {
          select: {
            action: true,
            resource: true,
          },
        },
      },
    });

    if (!rolePermission) {
      return res.status(404).json({ error: "Role permission not found" });
    }

    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    return res.status(200).json({
      message: "Permission removed from role successfully",
      removedPermission: {
        roleName: rolePermission.role.name,
        permission: `${rolePermission.permission.action}:${rolePermission.permission.resource}`,
      },
    });
  } catch (error) {
    console.error("Error removing permission from role:", error);
    return res
      .status(500)
      .json({ error: "Failed to remove permission from role" });
  }
};

// Get all role permissions (for admin overview)
export const getAllRolePermissions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        permission: {
          select: {
            id: true,
            action: true,
            resource: true,
            description: true,
          },
        },
      },
      orderBy: [
        { role: { name: "asc" } },
        { permission: { resource: "asc" } },
        { permission: { action: "asc" } },
      ],
    });

    return res.status(200).json(rolePermissions);
  } catch (error) {
    console.error("Error fetching all role permissions:", error);
    return res.status(500).json({ error: "Failed to fetch role permissions" });
  }
};

// Bulk assign permissions to multiple roles
export const bulkAssignPermissions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { assignments } = req.body; // Array of { roleId, permissionIds }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: "Assignments array is required" });
    }

    const results = [];

    for (const assignment of assignments) {
      const { roleId, permissionIds } = assignment;

      if (!roleId || !Array.isArray(permissionIds)) {
        continue;
      }

      try {
        // Remove existing permissions for this role
        await prisma.rolePermission.deleteMany({
          where: { roleId },
        });

        // Create new role permissions
        const rolePermissions = await Promise.all(
          permissionIds.map((permissionId: string) =>
            prisma.rolePermission.create({
              data: {
                roleId,
                permissionId,
              },
            })
          )
        );

        results.push({
          roleId,
          assignedPermissions: rolePermissions.length,
          success: true,
        });
      } catch (error) {
        results.push({
          roleId,
          success: false,
          error: "Failed to assign permissions",
        });
      }
    }

    return res.status(200).json({
      message: "Bulk permission assignment completed",
      results,
    });
  } catch (error) {
    console.error("Error bulk assigning permissions:", error);
    return res.status(500).json({ error: "Failed to bulk assign permissions" });
  }
};

// Get permissions grouped by resource
export const getPermissionsByResource = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    });

    const groupedPermissions = permissions.reduce((acc: any, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {});

    return res.status(200).json(groupedPermissions);
  } catch (error) {
    console.error("Error fetching permissions by resource:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch permissions by resource" });
  }
};

// Check if role has specific permission
export const checkRolePermission = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { roleId } = req.params;
    const { action, resource } = req.query;

    if (!action || !resource) {
      return res
        .status(400)
        .json({ error: "Action and resource are required" });
    }

    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        roleId,
        permission: {
          action: action as string,
          resource: resource as string,
        },
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
        permission: {
          select: {
            action: true,
            resource: true,
          },
        },
      },
    });

    return res.status(200).json({
      hasPermission: !!rolePermission,
      role: rolePermission?.role.name,
      permission: rolePermission
        ? `${rolePermission.permission.action}:${rolePermission.permission.resource}`
        : null,
    });
  } catch (error) {
    console.error("Error checking role permission:", error);
    return res.status(500).json({ error: "Failed to check role permission" });
  }
};

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define the permission structure
interface PermissionStructure {
  [module: string]: {
    [role: string]: {
      name: string;
      permissions: string[]; // ['Read', 'Write', 'Update', 'Delete']
    };
  };
}

// Default permission structure
export const DEFAULT_PERMISSIONS: PermissionStructure = {
  Inventory: {
    Admin: {
      name: "Admin",
      permissions: ["Read", "Write", "Update", "Delete"],
    },
    Shop_Owner: {
      name: "Shop Owner",
      permissions: ["Read"],
    },
  },
  ShopInventory: {
    Admin: {
      name: "Admin",
      permissions: ["Read", "Write", "Update", "Delete"],
    },
    Shop_Owner: {
      name: "Shop Owner",
      permissions: ["Read", "Write", "Update", "Delete"],
    },
  },
  Products: {
    Admin: {
      name: "Admin",
      permissions: ["Read", "Write", "Update", "Delete"],
    },
    Shop_Owner: {
      name: "Shop Owner",
      permissions: ["Read"],
    },
  },
  Billing: {
    Admin: {
      name: "Admin",
      permissions: ["Read", "Write", "Update", "Delete"],
    },
    Shop_Owner: {
      name: "Shop Owner",
      permissions: ["Read", "Write"],
    },
  },
  Employee: {
    Admin: {
      name: "Admin",
      permissions: ["Read", "Write", "Update", "Delete"],
    },
    Shop_Owner: {
      name: "Shop Owner",
      permissions: [],
    },
  },
};

// ===============================
// SIMPLIFIED PERMISSION CONTROLLER
// ===============================

// Get all permissions structure
export const getPermissionStructure = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    return res.status(200).json({
      success: true,
      data: DEFAULT_PERMISSIONS,
    });
  } catch (error) {
    console.error("Error fetching permission structure:", error);
    return res.status(500).json({ error: "Failed to fetch permissions" });
  }
};

// Get permissions for a specific module
export const getModulePermissions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { module } = req.params;

    if (!DEFAULT_PERMISSIONS[module]) {
      return res.status(404).json({ error: "Module not found" });
    }

    return res.status(200).json({
      success: true,
      module,
      data: DEFAULT_PERMISSIONS[module],
    });
  } catch (error) {
    console.error("Error fetching module permissions:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch module permissions" });
  }
};

// Get permissions for a specific role in a module
export const getRolePermissions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { module, role } = req.params;

    if (!DEFAULT_PERMISSIONS[module]) {
      return res.status(404).json({ error: "Module not found" });
    }

    if (!DEFAULT_PERMISSIONS[module][role]) {
      return res.status(404).json({ error: "Role not found in module" });
    }

    return res.status(200).json({
      success: true,
      module,
      role,
      data: DEFAULT_PERMISSIONS[module][role],
    });
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return res.status(500).json({ error: "Failed to fetch role permissions" });
  }
};

// Check if a role has specific permission for a module
export const checkPermission = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { module, role, permission } = req.params;

    if (!DEFAULT_PERMISSIONS[module]) {
      return res.status(404).json({ error: "Module not found" });
    }

    if (!DEFAULT_PERMISSIONS[module][role]) {
      return res.status(404).json({ error: "Role not found in module" });
    }

    const hasPermission =
      DEFAULT_PERMISSIONS[module][role].permissions.includes(permission);

    return res.status(200).json({
      success: true,
      module,
      role,
      permission,
      hasPermission,
      roleName: DEFAULT_PERMISSIONS[module][role].name,
    });
  } catch (error) {
    console.error("Error checking permission:", error);
    return res.status(500).json({ error: "Failed to check permission" });
  }
};

// Update permissions for a role in a module (if you need dynamic updates)
export const updateRolePermissions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { module, role } = req.params;
    const { permissions } = req.body;

    if (!DEFAULT_PERMISSIONS[module]) {
      return res.status(404).json({ error: "Module not found" });
    }

    if (!DEFAULT_PERMISSIONS[module][role]) {
      return res.status(404).json({ error: "Role not found in module" });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: "Permissions must be an array" });
    }

    const validPermissions = ["Read", "Write", "Update", "Delete"];
    const invalidPermissions = permissions.filter(
      (p) => !validPermissions.includes(p)
    );

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        error: "Invalid permissions",
        invalidPermissions,
        validPermissions,
      });
    }

    // Update the permissions (in a real app, you'd save this to database)
    DEFAULT_PERMISSIONS[module][role].permissions = permissions;

    return res.status(200).json({
      success: true,
      message: "Permissions updated successfully",
      module,
      role,
      data: DEFAULT_PERMISSIONS[module][role],
    });
  } catch (error) {
    console.error("Error updating permissions:", error);
    return res.status(500).json({ error: "Failed to update permissions" });
  }
};

// Get all modules
export const getModules = async (req: Request, res: Response): Promise<any> => {
  try {
    const modules = Object.keys(DEFAULT_PERMISSIONS);

    return res.status(200).json({
      success: true,
      modules,
      count: modules.length,
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return res.status(500).json({ error: "Failed to fetch modules" });
  }
};

// Get all roles across modules
export const getAllRoles = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const roles = new Set<string>();

    Object.values(DEFAULT_PERMISSIONS).forEach((moduleRoles) => {
      Object.keys(moduleRoles).forEach((role) => roles.add(role));
    });

    return res.status(200).json({
      success: true,
      roles: Array.from(roles),
      count: roles.size,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({ error: "Failed to fetch roles" });
  }
};

// Bulk check permissions for a role across all modules
export const bulkCheckPermissions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { role } = req.params;
    const result: any = {};

    Object.keys(DEFAULT_PERMISSIONS).forEach((module) => {
      if (DEFAULT_PERMISSIONS[module][role]) {
        result[module] = DEFAULT_PERMISSIONS[module][role];
      }
    });

    return res.status(200).json({
      success: true,
      role,
      permissions: result,
    });
  } catch (error) {
    console.error("Error bulk checking permissions:", error);
    return res.status(500).json({ error: "Failed to bulk check permissions" });
  }
};

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Types
interface PermissionStructure {
  [module: string]: {
    [role: string]: {
      name: string;
      permissions: string[];
    };
  };
}

interface DecodedToken {
  userId: string;
  roleId: string;
  roleName: string;
  [key: string]: any;
}

interface AuthenticatedRequest extends Request {
  user?: DecodedToken;
}

// Your existing permission structure
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

/**
 * Permission verification middleware
 * @param module - The module name (e.g., 'Inventory', 'Products')
 * @param requiredPermission - The required permission (e.g., 'Read', 'Write', 'Update', 'Delete')
 * @param permissionStructure - Optional custom permission structure (defaults to DEFAULT_PERMISSIONS)
 */
export const verifyPermission = (
  module: string,
  requiredPermission: string,
  permissionStructure: PermissionStructure = DEFAULT_PERMISSIONS
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Extract token from header
      const authHeader = req.headers.authorization;
      const token =
        authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.substring(7)
          : authHeader;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access token is required",
        });
      }

      // Verify and decode token
      let decodedToken: DecodedToken;
      try {
        decodedToken = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        ) as DecodedToken;
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      // Check if token has required fields
      if (!decodedToken.roleId && !decodedToken.roleName) {
        return res.status(403).json({
          success: false,
          message: "Token missing role information",
        });
      }

      // Get role identifier (prefer roleName, fallback to roleId)
      const roleIdentifier = decodedToken.roleName || decodedToken.roleId;

      // Check if module exists in permission structure
      if (!permissionStructure[module]) {
        return res.status(400).json({
          success: false,
          message: `Module '${module}' not found in permission structure`,
        });
      }

      // Check if role exists for the module
      if (!permissionStructure[module][roleIdentifier]) {
        return res.status(403).json({
          success: false,
          message: `Role '${roleIdentifier}' not authorized for module '${module}'`,
        });
      }

      // Get user's permissions for the module
      const userPermissions =
        permissionStructure[module][roleIdentifier].permissions;

      // Check if user has the required permission
      if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required: '${requiredPermission}' for module '${module}'`,
        });
      }

      // Add user info to request for downstream use
      req.user = decodedToken;

      // Permission check passed, proceed to next middleware
      next();
    } catch (error) {
      console.error("Permission verification error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during permission verification",
      });
    }
  };
};

/**
 * Multi-permission verification middleware
 * Checks if user has ANY of the specified permissions
 */
export const verifyAnyPermission = (
  module: string,
  requiredPermissions: string[],
  permissionStructure: PermissionStructure = DEFAULT_PERMISSIONS
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.headers.authorization;
      const token =
        authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.substring(7)
          : authHeader;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access token is required",
        });
      }

      let decodedToken: DecodedToken;
      try {
        decodedToken = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        ) as DecodedToken;
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      const roleIdentifier = decodedToken.roleName || decodedToken.roleId;

      if (
        !permissionStructure[module] ||
        !permissionStructure[module][roleIdentifier]
      ) {
        return res.status(403).json({
          success: false,
          message: `Access denied for module '${module}'`,
        });
      }

      const userPermissions =
        permissionStructure[module][roleIdentifier].permissions;
      const hasAnyPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission)
      );

      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required any of: [${requiredPermissions.join(
            ", "
          )}] for module '${module}'`,
        });
      }

      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Permission verification error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during permission verification",
      });
    }
  };
};

/**
 * Multi-permission verification middleware
 * Checks if user has ALL of the specified permissions
 */
export const verifyAllPermissions = (
  module: string,
  requiredPermissions: string[],
  permissionStructure: PermissionStructure = DEFAULT_PERMISSIONS
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.headers.authorization;
      const token =
        authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.substring(7)
          : authHeader;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access token is required",
        });
      }

      let decodedToken: DecodedToken;
      try {
        decodedToken = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        ) as DecodedToken;
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      const roleIdentifier = decodedToken.roleName || decodedToken.roleId;

      if (
        !permissionStructure[module] ||
        !permissionStructure[module][roleIdentifier]
      ) {
        return res.status(403).json({
          success: false,
          message: `Access denied for module '${module}'`,
        });
      }

      const userPermissions =
        permissionStructure[module][roleIdentifier].permissions;
      const hasAllPermissions = requiredPermissions.every((permission) =>
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        const missingPermissions = requiredPermissions.filter(
          (permission) => !userPermissions.includes(permission)
        );
        return res.status(403).json({
          success: false,
          message: `Missing permissions: [${missingPermissions.join(
            ", "
          )}] for module '${module}'`,
        });
      }

      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Permission verification error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during permission verification",
      });
    }
  };
};

/**
 * Basic authentication middleware (just verifies token without permission check)
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    let decodedToken: DecodedToken;
    try {
      decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      ) as DecodedToken;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

// Usage examples:
/*
// Single permission check
app.get('/api/inventory', verifyPermission('Inventory', 'Read'), (req, res) => {
  // Your route logic here
});

// Multiple permission check (user needs ANY of these)
app.post('/api/inventory', verifyAnyPermission('Inventory', ['Write', 'Update']), (req, res) => {
  // Your route logic here
});

// Multiple permission check (user needs ALL of these)
app.put('/api/inventory/:id', verifyAllPermissions('Inventory', ['Read', 'Update']), (req, res) => {
  // Your route logic here
});

// Just authentication without permission check
app.get('/api/profile', authenticate, (req, res) => {
  // Your route logic here
});

// Custom permission structure
const customPermissions = { ... };
app.delete('/api/inventory/:id', verifyPermission('Inventory', 'Delete', customPermissions), (req, res) => {
  // Your route logic here
});
*/

import { NextFunction, Request, Response, RequestHandler } from "express";
import { prisma } from "../../config/client";
import jwt from "jsonwebtoken";
import { Shop } from "@prisma/client";
import { hasPermission, isAdmin, isShopOwner } from "../../config/roles";
import { logger } from "../../utils/logger";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        publicId: string;
        name: string;
        role: string;
        roleId: string;
        email: string;
        contact: string;
        ownedShop?: Shop;
      };
    }
  }
}

// Simple authentication middleware to extract user from JWT
export const authenticateToken: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ message: "Access token required" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (!decoded || !decoded.id) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      publicId: decoded.publicId,
      name: decoded.name,
      role: decoded.role,
      roleId: decoded.roleId,
      email: decoded.email,
      contact: decoded.contact,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Check if user has permission for a specific resource and action
export const checkAccess = (
  resource: string,
  action: string
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: {
          id: true,
          role: true,
          ownedShop: true,
          managedShop: true,
        },
      });

      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      // Admin has access to everything
      if (user.role && isAdmin(user.role)) {
        next();
        return;
      }

      // For now, non-admin users are restricted
      // In the future, you can implement permission checking based on the simplified roles
      res.status(403).json({ message: "Access denied" });
      return;
    } catch (error) {
      logger.error("Permission check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};
 
// Alternative approach with explicit typing
export const checkShopAccess = (
  shopIdParam: string = "shopId"
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const shopId = req.params[shopIdParam] || req.body.shopId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        include: {
          ownedShop: true,
          managedShop: true,
        },
      });

      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      // Admin can access all shops
      if (user.role && isAdmin(user.role)) {
        next();
        return;
      }

      // Shop Owner can only access their own shop
      if (user.role && isShopOwner(user.role)) {
        // Type-safe access to shop relations
        const ownedShop = user.ownedShop;
        const managedShop = user.managedShop;
        const userShopId = ownedShop?.id || managedShop?.id;
        
        if (userShopId !== shopId) {
          res.status(403).json({ message: "Access denied to this shop" });
          return;
        }
      }

      next();
    } catch (error) {
      logger.error("Shop access check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Check if user is admin
export const requireAdmin: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }, // Convert to number based on your schema
      select: { role: true },
    });

    if (!user || !user.role || !isAdmin(user.role)) {
      res.status(403).json({ message: "Admin access required" });
      return;
    }

    next();
  } catch (error) {
    logger.error("Admin check error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

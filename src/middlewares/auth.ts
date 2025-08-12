import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { DatabaseService } from "../services/database";
import { createError } from "./ErrorHandlers/errorHandler";
import { UserWithRelations } from "../types/models";
import { logger } from "../utils/logger";
import { Shop } from "@prisma/client";

// import { UserRequestData } from '../types/models';

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

/**
 * Middleware to authenticate the user from the Authorization header token.
 * If the token is invalid or missing, it will throw an error with a 401 status code.
 * If the user is found, it will add the user to the request object and call the next middleware.
 * @param req The request object.
 * @param res The response object.
 * @param next The next middleware to call.
 */
export async function authenticateToken(
  req: any,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      throw createError("No token provided", 401, "NO_TOKEN");
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as jwt.JwtPayload;

    if (!decoded.id) {
      throw createError("Invalid token", 401, "INVALID_TOKEN");
    }

    // Get user with full relations
    const user = await DatabaseService.findUserById(decoded.id);
    req.user = user;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }
    next(error);
  }
}

export function checkRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createError("User not authenticated", 401, "NOT_AUTHENTICATED");
    }

    const hasRole = roles.includes(req.user.role || "");

    if (!hasRole) {
      logger.warn("Access denied - insufficient role", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
      });
      throw createError("Insufficient role", 403, "INSUFFICIENT_ROLE");
    }

    next();
  };
}

export function checkShopAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createError("User not authenticated", 401, "NOT_AUTHENTICATED");
    }

    const shopId = req.params.shopId || req.body.shopId;

    // Admin can access all shops
    if (req.user.role === "Admin") {
      return next();
    }

    // Check if user owns or manages this shop
    if (
      req.user.ownedShop?.id === shopId ||
      req.user.ownedShop?.id === shopId
    ) {
      return next();
    }

    logger.warn("Shop access denied", {
      userId: req.user.id,
      shopId,
      userRole: req.user.role,
    });

    throw createError("Shop access denied", 403, "SHOP_ACCESS_DENIED");
  };
}
// middlewares/authMiddleware.ts

export interface AuthRequest extends Request {
  userId?: number;
  publicId?: string;
}

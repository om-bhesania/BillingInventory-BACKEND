import { RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../types/models";

const prisma = new PrismaClient();

const verifyJWT: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ tokenValidity: false, message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload & { 
      id?: number; 
      publicId?: string;
      role?: string;
    };
    
    if (!decoded.id) {
      res.status(401).json({ tokenValidity: false, message: "Invalid token format" });
      return;
    }

    // Get user with full relations using the id from token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
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
        managedShops: true,
      },
    });

    if (!user) {
      res.status(401).json({ tokenValidity: false, message: "User not found" });
      return;
    }

    // Ensure shopIds is properly populated
    if (!user.shopIds) {
      user.shopIds = [];
    }

    // Set the user object on the request with proper type casting
    (req as unknown as AuthenticatedRequest).user = user as any;
    
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    res
      .status(403)
      .json({ tokenValidity: false, message: "Invalid or expired token" });
  }
};

export default verifyJWT;

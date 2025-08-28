"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.checkShopAccess = exports.checkAccess = exports.authenticateToken = void 0;
const client_1 = require("../../config/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const roles_1 = require("../../config/roles");
const logger_1 = require("../../utils/logger");
// Simple authentication middleware to extract user from JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
        if (!token) {
            res.status(401).json({ message: "Access token required" });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
    }
    catch (error) {
        console.error("Authentication error:", error);
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.authenticateToken = authenticateToken;
// Check if user has permission for a specific resource and action
const checkAccess = (resource, action) => {
    return async (req, res, next) => {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const user = await client_1.prisma.user.findUnique({
                where: { id: parseInt(userId) },
                select: {
                    id: true,
                    role: true,
                    managedShops: true,
                },
            });
            if (!user) {
                res.status(401).json({ message: "User not found" });
                return;
            }
            // Admin has access to everything
            if (user.role && (0, roles_1.isAdmin)(user.role)) {
                next();
                return;
            }
            // Allow Shop_Owner to read dashboard resources
            if (resource === "Dashboard" && action === "read" && user.role && (0, roles_1.isShopOwner)(user.role)) {
                next();
                return;
            }
            // Allow Shop_Owner to read Low Stock Alerts (their own data will be scoped in controller)
            if (resource === "Low Stock Alerts" && action === "read" && user.role && (0, roles_1.isShopOwner)(user.role)) {
                next();
                return;
            }
            res.status(403).json({ message: "Access denied" });
            return;
        }
        catch (error) {
            logger_1.logger.error("Permission check error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    };
};
exports.checkAccess = checkAccess;
// Alternative approach with explicit typing
const checkShopAccess = (shopIdParam = "shopId") => {
    return async (req, res, next) => {
        const userId = req.user?.id;
        const shopId = req.params[shopIdParam] || req.body.shopId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const user = await client_1.prisma.user.findUnique({
                where: { id: parseInt(userId) },
                include: {
                    managedShops: true,
                },
            });
            if (!user) {
                res.status(401).json({ message: "User not found" });
                return;
            }
            // Admin can access all shops
            if (user.role && (0, roles_1.isAdmin)(user.role)) {
                next();
                return;
            }
            // Shop Owner can only access their own shop
            if (user.role && (0, roles_1.isShopOwner)(user.role)) {
                // Type-safe access to shop relations
                const managedShops = user.managedShops;
                const userShopId = managedShops?.find((shop) => shop.id === shopId);
                if (userShopId !== shopId) {
                    res.status(403).json({ message: "Access denied to this shop" });
                    return;
                }
            }
            next();
        }
        catch (error) {
            logger_1.logger.error("Shop access check error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    };
};
exports.checkShopAccess = checkShopAccess;
// Check if user is admin
const requireAdmin = async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const user = await client_1.prisma.user.findUnique({
            where: { id: parseInt(userId) }, // Convert to number based on your schema
            select: { role: true },
        });
        if (!user || !user.role || !(0, roles_1.isAdmin)(user.role)) {
            res.status(403).json({ message: "Admin access required" });
            return;
        }
        next();
    }
    catch (error) {
        logger_1.logger.error("Admin check error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.requireAdmin = requireAdmin;

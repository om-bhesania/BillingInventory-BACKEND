"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.checkRole = checkRole;
exports.checkShopAccess = checkShopAccess;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../services/database");
const errorHandler_1 = require("./ErrorHandlers/errorHandler");
const logger_1 = require("../utils/logger");
/**
 * Middleware to authenticate the user from the Authorization header token.
 * If the token is invalid or missing, it will throw an error with a 401 status code.
 * If the user is found, it will add the user to the request object and call the next middleware.
 * @param req The request object.
 * @param res The response object.
 * @param next The next middleware to call.
 */
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(" ")[1];
        if (!token) {
            throw (0, errorHandler_1.createError)("No token provided", 401, "NO_TOKEN");
        }
        // Use the same secret used to sign access tokens
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decoded.id) {
            throw (0, errorHandler_1.createError)("Invalid token", 401, "INVALID_TOKEN");
        }
        // Get user with full relations
        const user = await database_1.DatabaseService.findUserById(decoded.id);
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                message: "Invalid token",
                code: "INVALID_TOKEN",
            });
            return;
        }
        next(error);
    }
}
function checkRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            throw (0, errorHandler_1.createError)("User not authenticated", 401, "NOT_AUTHENTICATED");
        }
        const hasRole = roles.includes(req.user.role || "");
        if (!hasRole) {
            logger_1.logger.warn("Access denied - insufficient role", {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: roles,
            });
            throw (0, errorHandler_1.createError)("Insufficient role", 403, "INSUFFICIENT_ROLE");
        }
        next();
    };
}
function checkShopAccess() {
    return async (req, res, next) => {
        if (!req.user) {
            throw (0, errorHandler_1.createError)("User not authenticated", 401, "NOT_AUTHENTICATED");
        }
        const shopId = req.params.shopId || req.body.shopId;
        // Admin can access all shops
        if (req.user.role === "Admin") {
            next();
            return;
        }
        // Check if user owns or manages this shop
        if (req.user.ownedShop?.id === shopId ||
            req.user.ownedShop?.id === shopId) {
            next();
            return;
        }
        logger_1.logger.warn("Shop access denied", {
            userId: req.user.id,
            shopId,
            userRole: req.user.role,
        });
        throw (0, errorHandler_1.createError)("Shop access denied", 403, "SHOP_ACCESS_DENIED");
    };
}

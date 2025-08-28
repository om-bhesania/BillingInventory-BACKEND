"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const verifyJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res
            .status(401)
            .json({ tokenValidity: false, message: "No token provided" });
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
        req.user = user;
        next();
    }
    catch (error) {
        console.error("JWT verification error:", error);
        res
            .status(403)
            .json({ tokenValidity: false, message: "Invalid or expired token" });
    }
};
exports.default = verifyJWT;

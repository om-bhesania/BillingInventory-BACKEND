"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PingController_1 = require("../controllers/PingController");
const VerifyJWT_1 = __importDefault(require("../middlewares/VerifyJWT"));
const pingRouter = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   name: Ping User
 *   description: Token validation & user info retrieval
 */
/**
 * @swagger
 * /ping/user:
 *   get:
 *     summary: Validate token & get logged-in user details
 *     tags: [Ping User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid and user info returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PingUserResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             example:
 *               tokenValidity: false
 *               message: "No token provided"
 *       403:
 *         description: Token is invalid or expired
 *         content:
 *           application/json:
 *             example:
 *               tokenValidity: false
 *               message: "Invalid or expired token"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             example:
 *               tokenValidity: false
 *               message: "User not found"
 */
pingRouter.get("/user", VerifyJWT_1.default, PingController_1.ping);
exports.default = pingRouter;

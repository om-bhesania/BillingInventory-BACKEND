import express from "express";
import { ping } from "../controllers/PingController";
import verifyJWT from "../middlewares/VerifyJWT";

const pingRouter = express.Router();

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
pingRouter.get("/user", verifyJWT, ping);

export default pingRouter;

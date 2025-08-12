import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";

import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./middlewares/ErrorHandlers/errorHandlers";
import { authRoutes } from "./routes/Auth/authRoutes";
import pingRouter from "./routes/PingRoute";
import roleRoutes from "./routes/Roles/roleRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import flavourRoutes from "./routes/flavourRoutes";
import productRoutes from "./routes/productRoutes";
import shopRoutes from "./routes/shopRoutes";
import swaggerSpecs from "./swaggerConfig";

// Load environment variables
dotenv.config();

// Initialize app
const app: Application = express();
// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Swagger configuration
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Swagger JSON endpoint
app.get("/swagger.json", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpecs);
});

/**
 * @swagger
 * tags:
 *   name: Health Check
 *   description: System health and status endpoints
 */

/**
 * @swagger
 * /ping:
 *   get:
 *     summary: Health check endpoint
 *     description: Simple ping endpoint to check if the server is running
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "pong"
 */
app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/flavours", flavourRoutes);
app.use("/api/shops", shopRoutes);
app.use("/ping", pingRouter);
// Global Error Handler
app.use(errorHandler);

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;

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
import notificationRoutes from "./routes/notificationRoutes";
import shopInventoryRoutes from "./routes/shopInventoryRoutes";
import restockRequestRoutes from "./routes/restockRequestRoutes";
import billingRoutes from "./routes/billingRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import auditLogRoutes from "./routes/auditLogRoutes";
import lowStockRoutes from "./routes/lowStockRoutes";
import packagingTypeRoutes from "./routes/packagingTypeRoutes";
import swaggerSpecs from "./swaggerConfig";

// Load environment variables
dotenv.config();

// Initialize app
const app: Application = express();
// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        process.env.FRONTEND_ORIGIN || "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
        "https://s3l06km6-5173.inc1.devtunnels.ms",
        "https://blizz.shreefood.co.in"
      ];
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
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
app.use("/api/shop-inventory", shopInventoryRoutes);
app.use("/api/restock-requests", restockRequestRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/audit-log", auditLogRoutes);
app.use("/api/low-stock", lowStockRoutes);
app.use("/api/packaging-types", packagingTypeRoutes);
app.use("/api/ping", pingRouter);
// Global Error Handler
app.use(errorHandler);

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;

import cors from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";

import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./middlewares/ErrorHandlers/errorHandlers";
import { authRoutes } from "./routes/Auth/authRoutes";
import PermissionsAndRoleRoutes from "./routes/PermissionRoutes";
import roleRoutes from "./routes/Roles/roleRoutes";
import shopInventoryRoutes from "./routes/ShopInventoryRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import flavourRoutes from "./routes/flavourRoutes";
import productRoutes from "./routes/productRoutes";
import shopRoutes from "./routes/shopRoutes";
import swaggerSpecs from "./swaggerConfig";
import { userDataFilter } from "./middlewares/filterDataHanlder";

// Load environment variables
dotenv.config();

// Initialize app
const app: Application = express();
// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration

app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
// Health check
app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/roles",  roleRoutes);
app.use("/api/categories",  categoryRoutes);
app.use("/api/products",  productRoutes);
app.use("/api/flavours",  flavourRoutes);
app.use("/api/shop",  shopRoutes);
app.use("/api/shopInventory",  shopInventoryRoutes);
app.use("/api/permissions", PermissionsAndRoleRoutes);

// Global Error Handler
app.use(errorHandler);

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;

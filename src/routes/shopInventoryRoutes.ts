import express, { RequestHandler } from "express";
import {
  createShopInventory,
  getShopInventory,
  updateShopInventoryStock,
  removeProductFromShop,
} from "../controllers/shopInventoryController";
import { authenticateToken } from "../middlewares/auth";

const shopInventoryRoutes = express.Router();

// Apply authentication middleware to all routes
shopInventoryRoutes.use(authenticateToken as any);

// Shop inventory routes
shopInventoryRoutes.post("/", createShopInventory as RequestHandler);
shopInventoryRoutes.get("/:shopId", getShopInventory as RequestHandler);
shopInventoryRoutes.patch(
  "/:id/stock",
  updateShopInventoryStock as RequestHandler
);
shopInventoryRoutes.delete("/:id", removeProductFromShop as RequestHandler);

export default shopInventoryRoutes;

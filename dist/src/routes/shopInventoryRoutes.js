"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const shopInventoryController_1 = require("../controllers/shopInventoryController");
const auth_1 = require("../middlewares/auth");
const shopInventoryRoutes = express_1.default.Router();
// Apply authentication middleware to all routes
shopInventoryRoutes.use(auth_1.authenticateToken);
// Shop inventory routes
shopInventoryRoutes.post("/", shopInventoryController_1.createShopInventory);
shopInventoryRoutes.get("/:shopId", shopInventoryController_1.getShopInventory);
shopInventoryRoutes.patch("/:id/stock", shopInventoryController_1.updateShopInventoryStock);
shopInventoryRoutes.delete("/:id", shopInventoryController_1.removeProductFromShop);
exports.default = shopInventoryRoutes;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const packagingTypeController_1 = require("../controllers/packagingTypeController");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get("/", packagingTypeController_1.getPackagingTypes);
router.post("/", packagingTypeController_1.createPackagingType);
router.put("/:id", packagingTypeController_1.updatePackagingType);
router.delete("/:id", packagingTypeController_1.deletePackagingType);
exports.default = router;

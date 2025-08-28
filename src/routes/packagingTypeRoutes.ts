import express, { RequestHandler } from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  createPackagingType,
  getPackagingTypes,
  updatePackagingType,
  deletePackagingType,
} from "../controllers/packagingTypeController";

const router = express.Router();

router.use(authenticateToken as any);

router.get("/", getPackagingTypes as RequestHandler);
router.post("/", createPackagingType as RequestHandler);
router.put("/:id", updatePackagingType as RequestHandler);
router.delete("/:id", deletePackagingType as RequestHandler);

export default router;



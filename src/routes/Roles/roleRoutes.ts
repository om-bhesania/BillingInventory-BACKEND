import express, { RequestHandler } from "express";
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
} from "../../controllers/Roles/Roles";
import { userDataFilter } from "../../middlewares/filterDataHanlder";
import { authMiddleware } from "../../middlewares/AuthMiddleware";

const roleRoutes = express.Router();
roleRoutes.post("/create", createRole as RequestHandler);
roleRoutes.get("/getall", getAllRoles as RequestHandler);
roleRoutes.get("/:id", getRoleById as RequestHandler);
roleRoutes.put("/update:id", updateRole as RequestHandler);
roleRoutes.delete("/delete:id", deleteRole as RequestHandler);

export default roleRoutes;

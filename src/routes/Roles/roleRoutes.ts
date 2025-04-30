import express, { RequestHandler } from "express";
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
} from "../../controllers/Roles/Roles";

const roleRoutes = express.Router();

roleRoutes.post("/create", createRole as RequestHandler);
roleRoutes.get("/getall", getAllRoles as RequestHandler);
roleRoutes.get("/:id", getRoleById as RequestHandler);
roleRoutes.put("/update:id", updateRole as RequestHandler);
roleRoutes.delete("/delete:id", deleteRole as RequestHandler);

export default roleRoutes;

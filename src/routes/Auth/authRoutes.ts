import { RequestHandler, Router } from "express";
import {
  register,
  getAllUsers,
  getUserById,
  deleteUserById,
} from "../../controllers/Auth/Register";
import { login, logout } from "../../controllers/Auth/Login";
import { authMiddleware } from "../../middlewares/AuthMiddleware";
import { userDataFilter } from "../../middlewares/filterDataHanlder";

const authRoutes = Router();

authRoutes.post("/register", authMiddleware , userDataFilter,register as RequestHandler);
authRoutes.post("/login", login as RequestHandler);
authRoutes.post("/logout", logout as RequestHandler);
authRoutes.get(
  "/users",
  authMiddleware,
  userDataFilter,
  getAllUsers as RequestHandler
);
authRoutes.get(
  "/users/:id",
  authMiddleware,
  userDataFilter,
  getUserById as RequestHandler
);
authRoutes.delete("/users/:id", deleteUserById as RequestHandler);

export { authRoutes };

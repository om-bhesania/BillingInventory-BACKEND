import { RequestHandler, Router } from "express";
import { register, getAllUsers, getUserById, deleteUserById } from "../../controllers/Auth/Register";
import { login, logout } from "../../controllers/Auth/Login";

const authRoutes = Router();

authRoutes.post("/register", register as RequestHandler);
authRoutes.post("/login", login as RequestHandler);
authRoutes.post("/logout", logout as RequestHandler);
authRoutes.get("/users", getAllUsers as RequestHandler);
authRoutes.get("/users/:id", getUserById as RequestHandler);
authRoutes.delete("/users/:id", deleteUserById as RequestHandler);

export { authRoutes };


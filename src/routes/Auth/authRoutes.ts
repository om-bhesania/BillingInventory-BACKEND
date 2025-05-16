import { RequestHandler, Router } from "express";
import { register } from "../../controllers/Auth/Register";
import { login, logout } from "../../controllers/Auth/Login";
const authRoutes = Router();

authRoutes.post("/register", register as RequestHandler);
authRoutes.post("/login", login as RequestHandler);
authRoutes.post("/logout", logout as RequestHandler);

export { authRoutes };

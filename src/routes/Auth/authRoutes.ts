import { RequestHandler, Router } from "express";
import {
  LoginController,
  LogoutController,
  RegisterController,
} from "../../controllers";

const authRoutes = Router();

authRoutes.post("/register", RegisterController as RequestHandler);
authRoutes.post("/login", LoginController as RequestHandler);
authRoutes.post("/logout", LogoutController as RequestHandler);

export { authRoutes };

import { RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthRequest } from "./auth";

const verifyJWT: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("authHeader", authHeader);
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ tokenValidity: false, message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  console.log("token", token);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    (req as AuthRequest).publicId = decoded.publicId; 
    next();
  } catch {
    res
      .status(403)
      .json({ tokenValidity: false, message: "Invalid or expired token" });
  }
};

export default verifyJWT;

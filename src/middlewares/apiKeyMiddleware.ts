import { Request, Response, NextFunction, RequestHandler } from "express";

const apiKeyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["authorization"];
  const expectedKey = process.env.API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    console.log(
      `[SECURITY] ❌ Blocked request from origin: ${req.headers.origin}, IP: ${req.ip}`
    );
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};

export default apiKeyMiddleware;

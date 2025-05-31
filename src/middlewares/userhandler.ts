import jwt from "jsonwebtoken";

// userMiddleware.js
export const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
    req.user = decoded; // Add user to request
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

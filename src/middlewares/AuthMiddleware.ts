import jwt from "jsonwebtoken";

// Store the current user ID in request context
let currentUserId: string | null = null;

/**
 * Middleware to extract and decode bearer token from headers
 * Sets the userId in request object and global context
 */
const authMiddleware = (req: any, res: any, next: any) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header missing" });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Invalid token format. Expected: Bearer <token>" });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Decode and verify the JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Extract user ID from decoded token
    let userId: string | undefined;
    if (typeof decoded === "object" && decoded !== null) {
      userId =
        ((decoded as jwt.JwtPayload).userId as string) ||
        ((decoded as jwt.JwtPayload).id as string) ||
        ((decoded as jwt.JwtPayload).sub as string);
    }

    if (!userId) {
      return res.status(401).json({ error: "User ID not found in token" });
    }

    // Store userId in request object
    req.userId = userId;

    // Store in global context for fetchUserId function
    currentUserId = userId;

    // Continue to next middleware/route handler
    next();
  } catch (error: any) {
    // Handle JWT errors
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    } else {
      return res.status(500).json({ error: "Token verification failed" });
    }
  }
};

/**
 * Simple function to get current user ID
 * Can be called from anywhere in your application after middleware runs
 */
const fetchUserId = () => {
  if (!currentUserId) {
    throw new Error(
      "No user ID available. Make sure the auth middleware has been executed."
    );
  }
  return currentUserId;
};

// Export both implementations
export {
  authMiddleware,
  fetchUserId,
};


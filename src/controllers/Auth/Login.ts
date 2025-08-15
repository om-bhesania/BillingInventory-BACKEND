import bcrypt from "bcryptjs";
import { Response } from "express";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { prisma } from "../../config/client";
import { logger } from "../../utils/logger";

const generateToken = (
  user: any,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"]
) => {
  const payload = {
    id: user.id,
    name: user.name,
    role: user.role,
    roleId: user.roleId,
    email: user.email,
    contact: user.contact,
    publicId: user.publicId,
  };
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, secret, options);
};

export const login = async (req: any, res: Response) => {
  const { email, password } = req.body;
  logger.auth.login(email, false); // Start with false, will update to true on success

  if (!email) {
    logger.warn("Login attempt without email");
    return res.status(400).json({ message: "Email is required" });
  }
  if (!password) {
    logger.warn("Login attempt without password", { email });
    return res.status(400).json({ message: "Password is required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      logger.auth.login(email, false);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logger.auth.login(email, false);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = generateToken(
      user,
      process.env.JWT_SECRET as Secret,
      "6h"
    );
    const refreshToken = generateToken(
      user,
      process.env.JWT_REFRESH_SECRET as Secret,
      "7d"
    );

    logger.auth.tokenGenerate(user.id.toString(), "access");
    logger.auth.tokenGenerate(user.id.toString(), "refresh");

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.auth.login(email, true);

    res.status(200).json({
      status: "success",
      message: "Login successful",
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        roleId: user.roleId,
        email: user.email,
        contact: user.contact,
        publicId: user.publicId,
      },
    });
  } catch (error) {
    logger.error("Login error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req: any, res: Response) => {
  const refreshToken = req.cookies?.refreshToken; // get from cookies

  if (!refreshToken) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as Secret
    );

    if (typeof decoded !== "object" || !decoded || !("id" in decoded)) {
      return res.status(400).json({ message: "Invalid token" });
    }

    // Optional: invalidate token in DB if you store them
    await prisma.user.update({
      where: { id: (decoded as any).id as number },
      data: {},
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({
      status: "success",
      message: "Logout successful",
      token: null,
      refreshToken: null,
      user: null,
    });
  } catch (error) {
    logger.error("Logout error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const refreshToken = async (req: any, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as Secret
    );
    if (typeof decoded !== "object" || !decoded || !("id" in decoded)) {
      return res.status(400).json({ message: "Invalid token" });
    }
    // Optionally, check if user still exists and is active
    const userId = (decoded as any).id as number;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const accessToken = generateToken(
      user,
      process.env.JWT_SECRET as Secret,
      "6h"
    );
    res.status(200).json({
      status: "success",
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        roleId: user.roleId,
        email: user.email,
        contact: user.contact,
        publicId: user.publicId,
      },
    });
  } catch (error) {
    logger.error("Refresh token error", error);
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

export const listUsers = async (_req: any, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roleId: true,
        contact: true,
        publicId: true,
        ownedShop: {
          select: {
            id: true,
            name: true,
          },
        },
        managedShop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    logger.auth.usersListed(users.length);
    res.status(200).json(users);
  } catch (error) {
    logger.error("Error fetching users", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

export const getRoles = async (_req: any, res: Response) => {
  try {
    const { ROLES } = await import("../../config/roles");
    logger.auth.rolesListed(ROLES.length);
    res.json(ROLES);
  } catch (error) {
    logger.error("Error fetching roles", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

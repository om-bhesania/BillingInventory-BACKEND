import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { yellowBG } from "console-log-colors";
import { AuthRequest } from "../middlewares/auth";

const prisma = new PrismaClient();

export const ping = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log("Ping request received", yellowBG(req.body.publicId));

  // Ensure publicId is provided
  if (!req?.publicId) {
    res.status(401).json({
      tokenValidity: false,
      message: "Unauthorized - Missing publicId in token",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { publicId: req?.publicId },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        Role: { select: { name: true } },
        publicId: true,
      },
    });

    if (!user) {
      res.status(404).json({
        tokenValidity: false,
        message: "User not found",
      });
      return;
    }

    res.json({
      tokenValidity: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.Role?.name || null,
        roleId: user?.roleId,
        publicId: user?.publicId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      tokenValidity: false,
      message: "Internal server error",
    });
  }
};

import bcrypt from "bcryptjs";
import { Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/client";
 
const generateToken = (user: any, secret: string,  expiresIn: string) => {
  const payload = {
    id: user.id,
    name: user.name,
    role: user.role,
    roleId: user.roleId,
    email: user.email,
    contact: user.contact,
  };
  return jwt.sign(payload, secret);
};

export const login = async (req: any, res: Response) => {
  const { email, password } = req.body;
  console.log("first", email, password);
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = generateToken(
      user,
      process.env.JWT_SECRET as string,
      "15m"
    );
    const refreshToken = generateToken(
      user,
      process.env.JWT_REFRESH_SECRET as string,
      "7d"
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

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
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req: any, res: Response) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    );

    if (typeof decoded !== 'object' || !decoded || !('id' in decoded)) {
      return res.status(400).json({ message: "Invalid token" });
    }

    await prisma.user.update({
      where: { id: decoded.id },
      data: {} // Provide necessary fields to update
    });

    res.status(200).json({
        status: "success",
        message: "Logout successful",
        token: null,
        refreshToken: null,
        user: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
 





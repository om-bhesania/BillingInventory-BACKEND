import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/client";
import generatePublicId from "../../utils/publicId";

export const register = async (req: Request, res: Response) => {
  const { email, password, role, name, contact, roleId } = req.body || {};
  console.log({
    email,
    password,
    role,
    name,
    contact,
    roleId,
  });
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }
  if (!role) {
    return res.status(400).json({ message: "Role is required" });
  }
  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (!contact) {
    return res.status(400).json({ message: "Contact is required" });
  }
  const roleExists = await prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!roleExists) {
    return res.status(400).json({ message: "Invalid roleId" });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name,
        publicId: generatePublicId(),
        email: email,
        password: await bcrypt.hash(password, 10),
        contact: contact,
        role: role,
        roleId: roleId,
      },
    });
    console.log("user", user);
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Email already exists" });
  }
};

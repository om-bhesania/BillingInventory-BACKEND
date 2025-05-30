import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/client";

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
  if (!roleId) {
    return res.status(400).json({ message: "RoleId is required" });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name,
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

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    console.log("users", users);
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

export const deleteUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.delete({
      where: { id: Number(id) },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};


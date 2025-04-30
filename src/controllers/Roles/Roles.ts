import { Request, Response } from "express";
import { prisma } from "../../config/client";
// CREATE
const createRole = async (req: Request, res: Response) => {
  const { name, description } = req.body || {};

  if (!name) return res.status(400).json({ message: "Name is required" });

  try {
    const role = await prisma.role.create({
      data: {
        name,
        description,
      },
    });
    console.log("role", role);
    res.status(201).json(role);
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Role with this name already exists" });
    }
    res.status(500).json({ message: "Something went wrong" });
  }
};

// READ ALL
const getAllRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        users: true,
        permissions: true,
      },
    });
    res.status(200).json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching roles" });
  }
};

// READ ONE
const getRoleById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: true,
        permissions: true,
      },
    });
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.status(200).json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching role" });
  }
};

// UPDATE
const updateRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body || {};

  if (!name) return res.status(400).json({ message: "Name is required" });

  try {
    const updated = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
      },
    });
    res.status(200).json(updated);
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Role not found" });
    }
    res.status(500).json({ message: "Error updating role" });
  }
};

// DELETE
const deleteRole = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.role.delete({ where: { id } });
    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Role not found" });
    }
    res.status(500).json({ message: "Error deleting role" });
  }
};

export { createRole, getAllRoles, getRoleById, updateRole, deleteRole };

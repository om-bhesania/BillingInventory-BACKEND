import { Request, Response } from "express";
import { prisma } from "../config/client";
import { logActivity } from "../utils/audit";

export const createPackagingType = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const pt = await (prisma as any).packagingType.create({ data: { name } });
    res.status(201).json(pt);
    await logActivity({
      type: "packaging",
      action: "created",
      entity: "PackagingType",
      entityId: pt.id,
      userId: (req as any).user?.publicId,
      meta: { name }
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "Packaging type already exists" });
    }
    console.log(error);
    res.status(500).json({ error: "Failed to create packaging type" });
  }
};

export const getPackagingTypes = async (_req: Request, res: Response) => {
  try {
    const list = await (prisma as any).packagingType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    res.json(list);
  } catch {
    res.status(500).json({ error: "Failed to fetch packaging types" });
  }
};

export const updatePackagingType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const pt = await (prisma as any).packagingType.update({ where: { id }, data: { name, isActive } });
    res.json(pt);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "Packaging type already exists" });
    }
    res.status(500).json({ error: "Failed to update packaging type" });
  }
};

export const deletePackagingType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).packagingType.update({ where: { id }, data: { isActive: false } });
    res.json({ message: "Packaging type deactivated" });
  } catch {
    res.status(500).json({ error: "Failed to delete packaging type" });
  }
};



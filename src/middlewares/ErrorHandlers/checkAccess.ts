import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/client";
 
export const checkAccess = (resource: string, action: string) => {
  return async (req: any, res: any, next: NextFunction) => {
    const userId = req.user?.id;
    const user: any = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
      },
    });

    const allowed = user?.role?.permissions.some(
      (rp: any) =>
        rp.permission.resource === resource && rp.permission.action === action
    );

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};

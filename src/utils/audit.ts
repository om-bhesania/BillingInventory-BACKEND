import { prisma } from "../config/client";

export type AuditPayload = {
  type: string;
  action: string;
  entity: string;
  entityId: string;
  userId?: string;
  shopId?: string;
  meta?: any;
};

export async function logActivity(payload: AuditPayload): Promise<void> {
  try {
    await (prisma as any).auditLog.create({ data: payload as any });
  } catch (e) {
    // Non-blocking – never throw from audit
  }
}



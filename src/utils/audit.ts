import { prisma } from "../config/client";

export type AuditMeta = {
  productId?: string;
  productName?: string;
  requestedAmount?: number;
  shopName?: string;
  status?: string;
  previousStatus?: string;
  actionPerformedBy?: string;
  actionTimestamp?: string;
  details?: string;
  inventoryUpdate?: {
    previousStock: number;
    newStock: number;
    stockAdded: number;
    inventoryUpdated: boolean;
  };
  [key: string]: any; // Allow additional properties
};

export type AuditPayload = {
  type: string;
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  shopId?: string;
  metadata?: AuditMeta;
  message?: string;
  status?: string;
  severity?: string;
};

export async function logActivity(payload: AuditPayload): Promise<void> {
  try {
    await (prisma as any).auditLog.create({ data: payload as any });
  } catch (e) {
    // Non-blocking – never throw from audit
  }
}



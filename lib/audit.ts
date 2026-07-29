import { headers } from "next/headers";
import { prisma } from "./prisma";

// Central helper for writing audit-log entries. Every security- or data-sensitive action
// (login, approve, override, generate, publish, …) records one of these.

export async function audit(params: {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  description: string;
}) {
  let ip: string | undefined;
  try {
    const h = headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      undefined;
  } catch {
    // headers() is unavailable outside a request scope; ignore.
  }

  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      description: params.description,
      ip,
    },
  });
}

/** Best-effort client IP for rate-limiting keys. */
export function clientIp(): string {
  try {
    const h = headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "local"
    );
  } catch {
    return "local";
  }
}

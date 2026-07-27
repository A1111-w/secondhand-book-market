import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserIdFromRequest, getUserIdFromToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type AuthorizationResult =
  | { ok: true; userId: number }
  | { ok: false; response: NextResponse };

export async function requireAdmin(req: NextRequest): Promise<AuthorizationResult> {
  const bearerUserId = getUserIdFromToken(req);
  const safeMethod = req.method === "GET" || req.method === "HEAD";
  if (!safeMethod && !bearerUserId) {
    return { ok: false, response: NextResponse.json({ error: "Bearer token required" }, { status: 401 }) };
  }
  const userId = bearerUserId ?? getUserIdFromRequest(req);
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { ok: true, userId };
}

export async function requireMaintenanceAdmin(req: NextRequest): Promise<AuthorizationResult> {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_MAINTENANCE_ENDPOINTS !== "true") {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return requireAdmin(req);
}

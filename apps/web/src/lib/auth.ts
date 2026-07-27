import type { NextRequest } from "next/server";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface AuthTokenPayload extends JwtPayload {
  id: number;
  userId?: number;
}

export const SESSION_COOKIE = "bookmarket_session";

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is required");
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
  return secret;
}

export function generateToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, jwtSecret(), { algorithm: "HS256", expiresIn: "7d" });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret(), { algorithms: ["HS256"] });
    if (!payload || typeof payload !== "object") return null;
    const rawId = payload.id ?? payload.userId;
    const id = typeof rawId === "number" ? rawId : Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    return { ...payload, id } as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function getBearerToken(req: NextRequest | Request): string | null {
  const authorization = req.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  return match?.[1] ?? null;
}

export function getUserIdFromToken(req: NextRequest | Request): number | null {
  const token = getBearerToken(req);
  return token ? verifyToken(token)?.id ?? null : null;
}

export function getUserIdFromRequest(req: NextRequest | Request): number | null {
  const bearerUserId = getUserIdFromToken(req);
  if (bearerUserId) return bearerUserId;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const rawToken = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!rawToken) return null;
  try {
    const token = decodeURIComponent(rawToken.slice(SESSION_COOKIE.length + 1));
    return verifyToken(token)?.id ?? null;
  } catch {
    return null;
  }
}

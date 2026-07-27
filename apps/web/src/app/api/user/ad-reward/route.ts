import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const MAX_CALLBACK_AGE_SECONDS = 5 * 60;

function configuredPoints(): number {
  const value = Number(process.env.AD_REWARD_POINTS ?? 50);
  return Number.isSafeInteger(value) ? Math.min(100, Math.max(1, value)) : 50;
}

function validSignature(userId: number, eventId: string, timestamp: string, signature: string, secret: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(`${userId}.${eventId}.${timestamp}`).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.AD_REWARD_ENABLED !== "true") {
      return NextResponse.json({ error: "Ad rewards are disabled" }, { status: 503 });
    }
    const secret = process.env.AD_REWARD_WEBHOOK_SECRET?.trim() ?? "";
    if (secret.length < 32) {
      console.error("AD_REWARD_WEBHOOK_SECRET must contain at least 32 characters");
      return NextResponse.json({ error: "Ad rewards are not configured" }, { status: 503 });
    }
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId = req.headers.get("x-ad-event-id")?.trim() ?? "";
    const timestamp = req.headers.get("x-ad-timestamp")?.trim() ?? "";
    const signature = req.headers.get("x-ad-signature")?.trim() ?? "";
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(eventId) || !/^\d{10}$/.test(timestamp)) {
      return NextResponse.json({ error: "Invalid ad callback metadata" }, { status: 400 });
    }
    const timestampSeconds = Number(timestamp);
    if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > MAX_CALLBACK_AGE_SECONDS) {
      return NextResponse.json({ error: "Ad callback has expired" }, { status: 401 });
    }
    if (!validSignature(userId, eventId, timestamp, signature, secret)) {
      return NextResponse.json({ error: "Invalid ad callback signature" }, { status: 401 });
    }

    const points = configuredPoints();
    const description = `AD_REWARD:${eventId}`;
    const lockName = `ad:${createHash("sha256").update(eventId).digest("hex").slice(0, 48)}`;
    const result = await prisma.$transaction(async (tx) => {
      const lockRows = await tx.$queryRaw<Array<{ acquired: number | bigint }>>(
        Prisma.sql`SELECT GET_LOCK(${lockName}, 5) AS acquired`,
      );
      if (Number(lockRows[0]?.acquired ?? 0) !== 1) throw new Error("Could not acquire ad reward lock");
      try {
        const duplicate = await tx.pointLog.findFirst({ where: { userId, description }, select: { id: true } });
        if (duplicate) return { awarded: false };
        await tx.user.update({ where: { id: userId }, data: { points: { increment: points } } });
        await tx.pointLog.create({ data: { userId, type: 1, amount: points, description } });
        return { awarded: true };
      } finally {
        await tx.$queryRaw(Prisma.sql`SELECT RELEASE_LOCK(${lockName})`).catch(() => undefined);
      }
    });

    return NextResponse.json({ success: true, points: result.awarded ? points : 0, duplicate: !result.awarded });
  } catch (error) {
    console.error("Ad reward failed", error);
    return NextResponse.json({ error: "Ad reward failed" }, { status: 500 });
  }
}

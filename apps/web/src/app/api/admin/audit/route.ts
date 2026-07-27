import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const authorization = await requireAdmin(req);
    if (!authorization.ok) return authorization.response;
    const raw: unknown = await req.json();
    const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const userId = Number(body.userId);
    const action = body.action;
    if (!Number.isSafeInteger(userId) || userId <= 0 || (action !== "pass" && action !== "reject")) {
      return NextResponse.json({ error: "userId and action (pass or reject) are required" }, { status: 400 });
    }
    const result = await prisma.user.updateMany({
      where: { id: userId, isStudent: 1 },
      data: { isStudent: action === "pass" ? 2 : 3 },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Pending verification was not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, msg: "Audit completed" });
  } catch (error) {
    console.error("Verification audit failed", error);
    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { resolveStoredPrivateFile, resolveStoredPublicFile } from "@/lib/uploadSecurity";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(req: NextRequest) {
  const authorization = await requireAdmin(req);
  if (!authorization.ok) return authorization.response;

  const userId = Number(req.nextUrl.searchParams.get("userId"));
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { studentCardImg: true },
  });
  const storedValue = user?.studentCardImg;
  if (!storedValue) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  const filePath = resolveStoredPrivateFile(storedValue, ["verification"])
    ?? resolveStoredPublicFile(storedValue, ["uploads/verify"]);
  if (!filePath) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  try {
    const body = await fs.readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()];
    if (!contentType) return NextResponse.json({ error: "Image not found" }, { status: 404 });
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}

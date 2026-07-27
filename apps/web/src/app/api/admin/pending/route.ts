import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authorization = await requireAdmin(req);
    if (!authorization.ok) return authorization.response;
    const users = await prisma.user.findMany({
      where: { isStudent: 1 },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        realName: true,
        studentId: true,
        college: true,
        major: true,
        className: true,
        grade: true,
        gender: true,
        studentCardImg: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      data: users.map((user) => ({
        ...user,
        studentCardImg: user.studentCardImg ? `/api/admin/verification-image?userId=${user.id}` : null,
      })),
    });
  } catch (error) {
    console.error("Pending verification query failed", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}

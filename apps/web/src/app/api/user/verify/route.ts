import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  deleteStoredPrivateFiles,
  deleteStoredPublicFiles,
  InvalidUploadError,
  UPLOAD_LIMITS,
  requireMultipart,
  writeImage,
} from "@/lib/uploadSecurity";

function field(formData: FormData, name: string, maxLength: number): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { studentCardImg: true } });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    requireMultipart(req);
    const formData = await req.formData();
    const file = formData.get("file");
    const realName = field(formData, "realName", 80);
    const studentId = field(formData, "studentId", 50);
    if (!(file instanceof File) || !realName || !studentId) {
      return NextResponse.json({ error: "Image, real name, and student ID are required" }, { status: 400 });
    }
    if (!/^[\p{L}\p{N}._-]{1,50}$/u.test(studentId)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const privateRoot = process.env.PRIVATE_UPLOAD_ROOT?.trim() || path.resolve(process.cwd(), ".data");
    const directory = path.resolve(privateRoot, "verification");
    const { filename } = await writeImage(file, directory, `student_${userId}`, UPLOAD_LIMITS.verificationImageBytes);
    const relativePath = `verification/${filename}`;
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isStudent: 1,
          studentCardImg: relativePath,
          realName,
          gender: field(formData, "gender", 20) || null,
          college: field(formData, "college", 100) || null,
          major: field(formData, "major", 100) || null,
          className: field(formData, "className", 100) || null,
          grade: field(formData, "grade", 30) || null,
          studentId,
        },
      });
    } catch (error) {
      await deleteStoredPrivateFiles(relativePath, ["verification"]);
      throw error;
    }
    await deleteStoredPrivateFiles(currentUser.studentCardImg, ["verification"]);
    // Remove an old public verification image after the database has moved to the private path.
    await deleteStoredPublicFiles(currentUser.studentCardImg, ["uploads/verify"]);
    return NextResponse.json({ success: true, msg: "Verification submitted" });
  } catch (error) {
    if (error instanceof InvalidUploadError) {
      const status = error.message.includes("exceeds") ? 413 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Student verification upload failed", error);
    return NextResponse.json({ error: "Verification submission failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ status: 0 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isStudent: true } });
  return NextResponse.json({ status: user?.isStudent ?? 0 });
}

import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toAbsoluteUrl } from "@/lib/urlUtils";
import {
  deleteStoredPublicFiles,
  InvalidUploadError,
  UPLOAD_LIMITS,
  requireMultipart,
  writeImage,
} from "@/lib/uploadSecurity";
import { withoutPassword } from "@/lib/publicData";

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    requireMultipart(req);
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Image file is required" }, { status: 400 });

    const directory = path.resolve(process.cwd(), "public", "uploads", "avatars");
    const { filename } = await writeImage(file, directory, `avatar_${userId}`, UPLOAD_LIMITS.avatarBytes);
    const relativeAvatarPath = `/uploads/avatars/${filename}`;
    let updatedUser;
    try {
      updatedUser = await prisma.user.update({ where: { id: userId }, data: { avatar: relativeAvatarPath } });
    } catch (error) {
      await deleteStoredPublicFiles(relativeAvatarPath, ["uploads/avatars"]);
      throw error;
    }
    await deleteStoredPublicFiles(currentUser.avatar, ["uploads/avatars"]);

    const userWithoutPassword = withoutPassword(updatedUser);
    return NextResponse.json({
      message: "Avatar uploaded",
      user: { ...userWithoutPassword, avatar: toAbsoluteUrl(relativeAvatarPath) },
      avatarUrl: toAbsoluteUrl(relativeAvatarPath),
    });
  } catch (error) {
    if (error instanceof InvalidUploadError) {
      const status = error.message.includes("exceeds") ? 413 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Avatar upload failed", error);
    return NextResponse.json({ error: "Avatar upload failed" }, { status: 500 });
  }
}

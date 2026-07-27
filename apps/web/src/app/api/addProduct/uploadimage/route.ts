import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import { toAbsoluteUrl } from "@/lib/urlUtils";
import {
  InvalidUploadError,
  UPLOAD_LIMITS,
  requireMultipart,
  writeImage,
} from "@/lib/uploadSecurity";

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireMultipart(req);
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Image file is required" }, { status: 400 });

    const claimedUser = formData.get("user");
    if (typeof claimedUser === "string" && claimedUser && Number(claimedUser) !== userId) {
      return NextResponse.json({ error: "The upload owner must match the authenticated user" }, { status: 403 });
    }

    const directory = path.resolve(process.cwd(), "public", "productimage", String(userId));
    const { filename } = await writeImage(file, directory, "product", UPLOAD_LIMITS.productImageBytes);
    const imageUrl = `/productimage/${userId}/${filename}`;
    return NextResponse.json({ url: toAbsoluteUrl(imageUrl) });
  } catch (error) {
    if (error instanceof InvalidUploadError) {
      const status = error.message.includes("exceeds") ? 413 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Product image upload failed", error);
    return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
  }
}

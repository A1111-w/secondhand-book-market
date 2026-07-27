import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import { getAddressIndex } from "@/lib/productUtils";
import prisma from "@/lib/prisma";
import { deleteStoredPublicFiles } from "@/lib/uploadSecurity";
import { processImages, toAbsoluteUrl } from "@/lib/urlUtils";

type Props = { params: Promise<{ id: string }> };

function positiveId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function bodyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid request body");
  return value as Record<string, unknown>;
}

function optionalText(body: Record<string, unknown>, key: string, max: number): string | null | undefined {
  if (!(key in body)) return undefined;
  if (body[key] === null || body[key] === "") return null;
  if (typeof body[key] !== "string") throw new Error(`${key} must be a string`);
  const value = body[key].trim();
  if (value.length > max) throw new Error(`${key} is too long`);
  return value || null;
}

function rangeIncludes(range: Prisma.JsonValue, address: string | null): boolean {
  return Boolean(address && Array.isArray(range) && range.some((item) => item === address));
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const productId = positiveId((await params).id);
    if (!productId) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    const currentUserId = getUserIdFromToken(req);
    const userAddress = req.nextUrl.searchParams.get("address")?.slice(0, 100) || null;
    const userIndex = userAddress ? getAddressIndex(userAddress) : -1;

    const productRecord = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            address: true,
            creditScore: true,
            ratingSum: true,
            ratingCount: true,
          },
        },
      },
    });
    if (!productRecord) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const [distanceRecord, unlockRecord, favorite] = await Promise.all([
      productRecord.positionIndex !== null && userIndex >= 0
        ? prisma.distance.findUnique({
          where: { fromIndex_toIndex: { fromIndex: productRecord.positionIndex, toIndex: userIndex } },
        })
        : null,
      currentUserId && currentUserId !== productRecord.userId
        ? prisma.unlockedContact.findUnique({ where: { userId_productId: { userId: currentUserId, productId } } })
        : null,
      currentUserId
        ? prisma.favorite.findUnique({ where: { userId_productId: { userId: currentUserId, productId } } })
        : null,
    ]);
    const isUnlocked = currentUserId === productRecord.userId || Boolean(unlockRecord);
    const calculatedDistance = rangeIncludes(productRecord.range, userAddress) ? 10 : distanceRecord?.value ?? null;
    const averageRating = productRecord.user.ratingCount > 0
      ? Number((productRecord.user.ratingSum / productRecord.user.ratingCount).toFixed(1))
      : 3.5;

    const { user, contact, ...productFields } = productRecord;
    return NextResponse.json({
      ...productFields,
      contact: isUnlocked ? contact : "******",
      images: processImages(productRecord.images),
      u_username: user.username,
      u_avatar: toAbsoluteUrl(user.avatar),
      u_address: user.address,
      u_creditScore: user.creditScore,
      db_distance: distanceRecord?.value ?? null,
      calc_dist: calculatedDistance,
      user: {
        id: user.id,
        username: user.username,
        avatar: toAbsoluteUrl(user.avatar),
        address: user.address,
        creditScore: user.creditScore,
        avgRating: averageRating,
      },
      distance: calculatedDistance,
      isFavorited: Boolean(favorite),
      isUnlocked,
    });
  } catch (error) {
    console.error("Product detail failed", error);
    return NextResponse.json({ error: "Product detail failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Props) {
  try {
    const productId = positiveId((await params).id);
    if (!productId) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = bodyRecord(await req.json());
    const data: Prisma.ProductUpdateInput = {};
    const stringFields = [
      ["name", 200], ["description", 5_000], ["images", 20_000], ["category", 100],
      ["contact", 200], ["isbn", 32], ["way", 50], ["position", 100],
    ] as const;
    for (const [key, max] of stringFields) {
      const value = optionalText(body, key, max);
      if (value !== undefined) data[key] = value as never;
    }
    if ("price" in body) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0 || price > 100_000_000) throw new Error("Invalid price");
      data.price = price;
    }
    if ("status" in body) {
      const status = Number(body.status);
      if (!Number.isInteger(status) || ![0, 1].includes(status)) throw new Error("Invalid status");
      data.status = status;
    }
    if ("range" in body) {
      let range = body.range;
      if (typeof range === "string") range = JSON.parse(range) as unknown;
      if (range !== null && (!Array.isArray(range) || range.length > 100 || range.some((item) => typeof item !== "string" || item.length > 100))) {
        throw new Error("Invalid range");
      }
      data.range = range === null ? Prisma.JsonNull : range as Prisma.InputJsonArray;
    }
    if ("position" in body) {
      const position = optionalText(body, "position", 100);
      const index = position ? getAddressIndex(position) : -1;
      data.positionIndex = index >= 0 ? index : null;
    }
    if (Object.keys(data).length === 0) return NextResponse.json(existing);
    return NextResponse.json(await prisma.product.update({ where: { id: productId }, data }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid update";
    if (message.startsWith("Invalid") || message.includes("must be") || message.includes("too long")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Product update failed", error);
    return NextResponse.json({ error: "Product update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const productId = positiveId((await params).id);
    if (!productId) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (product.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.product.delete({ where: { id: productId } });
    await deleteStoredPublicFiles(product.images, [`productimage/${product.userId}`]);
    return NextResponse.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Product deletion failed", error);
    return NextResponse.json({ error: "Product deletion failed" }, { status: 500 });
  }
}

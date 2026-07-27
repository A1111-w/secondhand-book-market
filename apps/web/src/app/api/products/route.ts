import { NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import { InvalidProductInputError, parseProductCreateInput } from "@/lib/productInput";
import prisma from "@/lib/prisma";
import { withoutContact } from "@/lib/publicData";

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const input = parseProductCreateInput(await req.json());
    if (input.claimedUserId !== undefined && input.claimedUserId !== userId) {
      return NextResponse.json({ success: false, error: "Product owner must match the authenticated user" }, { status: 403 });
    }
    const product = await prisma.product.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        images: input.images,
        category: input.category,
        contact: input.contact,
        isbn: input.isbn,
        price: input.price,
        position: input.position,
        way: input.way,
        range: input.range,
      },
    });
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidProductInputError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("Product creation failed", error);
    return NextResponse.json({ success: false, error: "Product creation failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const offset = Math.max(0, Number.parseInt(searchParams.get("offset") || "0", 10) || 0);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "10", 10) || 10));
    const category = searchParams.get("category")?.trim().slice(0, 100) || undefined;
    const where = category ? { category } : undefined;
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.product.count({ where }),
    ]);
    return NextResponse.json({ products: products.map(withoutContact), total });
  } catch (error) {
    console.error("Product listing failed", error);
    return NextResponse.json({ success: false, error: "Product listing failed" }, { status: 500 });
  }
}

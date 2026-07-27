import { NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import { getAddressIndex } from "@/lib/productUtils";
import { InvalidProductInputError, parseProductCreateInput } from "@/lib/productInput";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const input = parseProductCreateInput(await req.json());
    if (input.claimedUserId !== undefined && input.claimedUserId !== userId) {
      return NextResponse.json({ error: "Product owner must match the authenticated user" }, { status: 403 });
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
        positionIndex: input.position ? getAddressIndex(input.position) : null,
        way: input.way,
        range: input.range,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidProductInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Product creation failed", error);
    return NextResponse.json({ error: "Product creation failed" }, { status: 500 });
  }
}

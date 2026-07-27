import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import { getAddressIndex } from "@/lib/productUtils";
import prisma from "@/lib/prisma";
import { processImages, toAbsoluteUrl } from "@/lib/urlUtils";

type ProductRow = Record<string, unknown> & {
  id: number | bigint;
  name: string;
  description: string | null;
  images: string;
  category: string;
  isbn: string | null;
  price: number;
  position: string | null;
  way: string;
  range: unknown;
  createdAt: Date;
  userId: number | bigint;
  status: number;
  u_username: string | null;
  u_avatar: string | null;
  u_address: string | null;
  calc_dist: number | bigint | null;
  view_count: number | bigint;
};

function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(value: unknown): unknown {
  return typeof value === "bigint" ? Number(value) : value;
}

export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json();
    const body = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const keyword = typeof body.keyword === "string" ? body.keyword.trim().slice(0, 200) : "";
    const category = typeof body.category === "string" ? body.category.trim().slice(0, 100) : "";
    const address = typeof body.address === "string" ? body.address.trim().slice(0, 100) : "";
    const offset = Math.max(0, Math.trunc(finiteNumber(body.skip)));
    const limit = Math.min(100, Math.max(1, Math.trunc(finiteNumber(body.take, 10))));
    const distanceSort = Math.min(100, Math.max(0, finiteNumber(body.distanceSort)));
    const priceSort = Math.min(100, Math.max(0, finiteNumber(body.priceSort)));
    const userAddressIndex = address ? getAddressIndex(address) : -1;
    const currentUserId = getUserIdFromToken(req);
    const searchKeyword = `%${keyword}%`;

    let orderBy = Prisma.sql`p.status ASC, p.createdAt DESC`;
    if (priceSort > 2 || distanceSort > 2) {
      const priceWeight = priceSort / 100;
      const distanceWeight = distanceSort / 100;
      orderBy = Prisma.sql`p.status ASC, (p.price * ${priceWeight} + COALESCE(calc_dist, 100000) * ${distanceWeight}) ASC`;
    } else if (priceSort === 1) {
      orderBy = Prisma.sql`p.status ASC, p.price ASC`;
    } else if (priceSort === 2) {
      orderBy = Prisma.sql`p.status ASC, p.price DESC`;
    } else if (distanceSort === 1) {
      orderBy = Prisma.sql`p.status ASC, CASE WHEN calc_dist IS NULL THEN 1 ELSE 0 END, calc_dist ASC`;
    }

    const products = await prisma.$queryRaw<ProductRow[]>(Prisma.sql`
      SELECT
        p.*,
        u.username AS u_username,
        u.avatar AS u_avatar,
        u.address AS u_address,
        d.value AS db_distance,
        (SELECT COUNT(*) FROM BrowseHistory WHERE productId = p.id) AS view_count,
        CASE
          WHEN JSON_SEARCH(p.range, 'one', ${address}) IS NOT NULL THEN 10
          ELSE d.value
        END AS calc_dist
      FROM Product p
      JOIN User u ON p.userId = u.id
      LEFT JOIN Distance d ON (p.positionIndex = d.fromIndex AND d.toIndex = ${userAddressIndex})
      WHERE 1 = 1
        ${category ? Prisma.sql`AND p.category = ${category}` : Prisma.empty}
        ${keyword ? Prisma.sql`AND (p.name LIKE ${searchKeyword} OR p.description LIKE ${searchKeyword} OR p.isbn LIKE ${searchKeyword})` : Prisma.empty}
        ${currentUserId ? Prisma.sql`AND p.userId != ${currentUserId}` : Prisma.empty}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `);

    return NextResponse.json(products.map((row) => ({
      id: toNumber(row.id),
      name: row.name,
      description: row.description,
      images: processImages(row.images),
      category: row.category,
      contact: "******",
      isbn: row.isbn,
      price: row.price,
      position: row.position,
      way: row.way,
      range: row.range,
      createdAt: row.createdAt,
      userId: toNumber(row.userId),
      status: toNumber(row.status),
      user: {
        id: toNumber(row.userId),
        username: row.u_username,
        avatar: toAbsoluteUrl(row.u_avatar),
        address: row.u_address,
      },
      distance: row.calc_dist === null ? null : toNumber(row.calc_dist),
      viewCount: toNumber(row.view_count) || 0,
      isUnlocked: false,
    })));
  } catch (error) {
    console.error("Product listing failed", error);
    return NextResponse.json({ error: "Product listing failed" }, { status: 500 });
  }
}

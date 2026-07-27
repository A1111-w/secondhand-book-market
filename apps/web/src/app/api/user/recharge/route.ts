import { NextResponse } from "next/server";

function disabled() {
  return NextResponse.json({ error: "Recharge is not configured" }, { status: 501 });
}

// The previous file was an accidental copy of the product-detail route and exposed unrelated data.
export const GET = disabled;
export const POST = disabled;
export const PUT = disabled;
export const DELETE = disabled;

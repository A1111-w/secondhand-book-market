import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "secondhand-book-market", time: new Date().toISOString() });
}

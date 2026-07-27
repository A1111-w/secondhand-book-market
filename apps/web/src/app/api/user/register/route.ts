import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { withoutPassword } from "@/lib/publicData";

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const phone = typeof record.phone === "string" ? record.phone.trim() : "";
    const password = typeof record.password === "string" ? record.password : "";
    const username = typeof record.username === "string" ? record.username.trim() : "";

    if (!/^\+?[0-9]{6,20}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Password must be 8-128 characters" }, { status: 400 });
    }
    if (username.length > 50) {
      return NextResponse.json({ error: "Username is too long" }, { status: 400 });
    }
    if (await prisma.user.findUnique({ where: { phone }, select: { id: true } })) {
      return NextResponse.json({ error: "Phone number is already registered" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        phone,
        password: await bcrypt.hash(password, 12),
        username: username || phone,
      },
    });
    const userWithoutPassword = withoutPassword(user);
    return NextResponse.json({ user: userWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

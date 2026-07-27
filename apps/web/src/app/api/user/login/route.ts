import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { generateToken, SESSION_COOKIE } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { withoutPassword } from "@/lib/publicData";

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const phone = typeof record.phone === "string" ? record.phone.trim() : "";
    const password = typeof record.password === "string" ? record.password : "";
    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user?.password || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 });
    }

    const token = generateToken({ id: user.id, phone: user.phone });
    const userWithoutPassword = withoutPassword(user);
    const response = NextResponse.json({ user: userWithoutPassword, token });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

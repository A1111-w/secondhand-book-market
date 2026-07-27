// src/app/api/user/updata/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getUserIdFromToken } from "@/lib/auth";
import { toAbsoluteUrl } from "@/lib/urlUtils";
import { withoutPassword } from "@/lib/publicData";

/** 允许的地址列表 */
const validAddresses = [
  "本科综合楼","行政楼","专L17","专L18","专G1","专G2","专G3",
  "专G4","专A1","专A2","专A3","专A4","本C1","本C2","本C3","本C4",
  "专L16","专L13","专L12","专L11","专L10","专L9","专L8","专L7","专L4","专L3",
  "专L2","专L1","本B9","本B4","本B3","本B2","本B1","本D1","本C8","本C7",
  "本C6","本C5","专L5","专L6","专L15","专D2","专D6","专D5"
];

export async function POST(req: NextRequest) {
  try {
    // 1. 鉴权
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: "未登录或 token 无效" }, { status: 401 });
    }

    // 2. 解析 body
    const body: unknown = await req.json();
    const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const username = typeof record.username === "string" ? record.username.trim() : undefined;
    const address = typeof record.address === "string" ? record.address.trim() : undefined;
    const contact = typeof record.contact === "string" ? record.contact.trim() : undefined;

    if ((username?.length ?? 0) > 50 || (contact?.length ?? 0) > 100) {
      return NextResponse.json({ error: "资料字段过长" }, { status: 400 });
    }

    // 3. 校验 address
    if (address && !validAddresses.includes(address)) {
      return NextResponse.json({ error: "地址不在允许列表内" }, { status: 400 });
    }

    // 4. 构建更新对象
    const updateData: Prisma.UserUpdateInput = {};
    if (username !== undefined) updateData.username = username || null;
    if (address !== undefined) updateData.address = address || null;
    if (contact !== undefined) updateData.contact = contact || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ msg: "无更新内容" }, { status: 200 });
    }

    // 5. 更新数据库
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 6. 返回结果
    const userWithoutPassword = withoutPassword(updatedUser);

    // 这里必须调用 toAbsoluteUrl，否则返回的是相对路径，前端图片会挂！
    const userWithAbsoluteUrl = {
        ...userWithoutPassword,
        avatar: toAbsoluteUrl(userWithoutPassword.avatar)
    };

    return NextResponse.json({ msg: "更新成功", user: userWithAbsoluteUrl });

  } catch (err) {
    console.error("更新 profile 失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

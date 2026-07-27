import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const currentUserId = getUserIdFromToken(req);
    if (!currentUserId) return NextResponse.json({ count: 0 });

    // 只查一个数字
    const count = await prisma.message.count({
      where: {
        toUserId: currentUserId, // 发给我的
        isRead: false            // 未读的
      }
    });

    return NextResponse.json({ count });

  } catch (error) {
    console.error('获取未读数失败:', error);
    return NextResponse.json({ count: 0 });
  }
}
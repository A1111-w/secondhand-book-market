import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const logs = await prisma.pointLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // 暂时只取最近50条
    });

    // 格式化时间
    const data = logs.map(log => ({
      ...log,
      time: new Date(log.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

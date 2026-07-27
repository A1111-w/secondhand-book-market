import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';

// POST: 记录用户搜索的关键词
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword } = body;
    const userId = getUserIdFromToken(req);

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ success: true }); // 空词不记，但也别报错
    }

    await prisma.searchLog.create({
      data: {
        keyword: keyword.trim(),
        userId: userId || null
      }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '记录失败' }, { status: 500 });
  }
}

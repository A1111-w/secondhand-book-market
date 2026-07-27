import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';
import { processImages } from '@/lib/urlUtils';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const list = await prisma.unlockedContact.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            contact: true, // 既然已解锁，直接查出来给前端
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 数据处理
    const data = list.map(item => ({
      ...item,
      product: {
        ...item.product,
        images: processImages(item.product.images)
      }
    }));

    return NextResponse.json({ data });

  } catch {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

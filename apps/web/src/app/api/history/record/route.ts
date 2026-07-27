import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';

// POST: 记录浏览历史
export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ msg: '未登录，不记录' }); // 未登录不强制报错，忽略即可

    const body = await req.json();
    let { productId } = body;
    productId = Number(productId);

    if (isNaN(productId)) {
       return NextResponse.json({ error: '无效的商品ID' }, { status: 400 });
    }

    // 使用 upsert：如果存在则更新时间，不存在则创建
    await prisma.browseHistory.upsert({
      where: {
        userId_productId: {
          userId: userId,
          productId: productId
        }
      },
      update: {
        viewedAt: new Date() // 更新为最新时间
      },
      create: {
        userId: userId,
        productId: productId,
        viewedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('记录历史失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processImages } from '@/lib/urlUtils';

export async function GET() {
  try {
    // 1. 计算1个月前的时间点
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // 2. 统计浏览记录最多的商品ID
    const ranking = await prisma.browseHistory.groupBy({
      by: ['productId'],
      where: {
        viewedAt: { gte: oneMonthAgo } // 最近1个月
      },
      _count: {
        productId: true
      },
      orderBy: {
        _count: {
          productId: 'desc'
        }
      },
      take: 8 // 取前8名
    });

    // 如果没有数据，直接返回空
    if (ranking.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 3. 根据 ID 查出具体的商品详情
    const productIds = ranking.map(r => r.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: 0 // 必须是在售的，已售出的不上榜
      },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        // 顺便把浏览量也带回去给前端显示
        _count: {
          select: { history: true }
        }
      }
    });

    // 4. 按照排名的顺序重新排序 products
    // 因为 findMany 返回的顺序不一定和 in 数组一致
    const sortedProducts = productIds
      .map(id => products.find(p => p.id === id))
      .filter(p => p !== undefined) // 过滤掉可能已删除或非在售的商品
      .map(p => ({
        ...p!,
        images: processImages(p!.images) // 加上这一行
      }));

    return NextResponse.json({ data: sortedProducts });

  } catch (error) {
    console.error('获取热搜榜失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
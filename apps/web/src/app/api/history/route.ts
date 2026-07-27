import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';
import { processImages } from '@/lib/urlUtils';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get('keyword') || '';
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '20');

    const history = await prisma.browseHistory.findMany({
      where: {
        userId: userId,
        product: {
          OR: [
            { name: { contains: keyword } },
            { description: { contains: keyword } },
            { isbn: { contains: keyword } }
          ]
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            status: true,
            isbn: true
          }
        }
      },
      orderBy: {
        viewedAt: 'desc'
      },
      skip,
      take
    });

    const processedHistory = history.map(item => ({
      ...item,
      product: {
        ...item.product,
        // 把 images 字段处理成带域名的绝对路径 (可能是单张或数组)
        images: processImages(item.product.images)
      }
    }));

    return NextResponse.json({ data: processedHistory });

  } catch (error) {
    console.error('获取历史失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
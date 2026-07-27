import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';
import { toAbsoluteUrl } from '@/lib/urlUtils';

export async function GET(req: NextRequest) {
  try {
    // 1. 身份验证
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Token 无效' }, { status: 401 });
    }

    // 2. 查询该用户发布的商品
    const products = await prisma.product.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const processedProducts = products.map(p => {
      let firstImage = '';
      try {
        // 尝试解析 JSON (例如 '["/img/1.jpg", "/img/2.jpg"]')
        const imagesArr = JSON.parse(p.images);
        if (Array.isArray(imagesArr) && imagesArr.length > 0) {
          firstImage = imagesArr[0]; // 取第一张
        } else {
          firstImage = p.images; // 可能是单字符串
        }
      } catch {
        // 解析失败，说明本身就是普通字符串
        firstImage = p.images;
      }

      return {
        ...p,
        images: toAbsoluteUrl(firstImage)
      };
    });

    return NextResponse.json(processedProducts);

  } catch (error) {
    console.error('获取用户商品列表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

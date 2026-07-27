import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { toAbsoluteUrl } from '@/lib/urlUtils';
import { withoutContact } from '@/lib/publicData';

// GET /api/user/[userId]/products
// 获取指定用户发布的商品列表
type Props = {
  params: Promise<{ userId: string }>
};

export async function GET(
  req: NextRequest,
  { params }: Props
) {
  try {
    const { userId: userIdStr } = await params;
    const userId = parseInt(userIdStr, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    // 查询该用户发布的所有商品
    const products = await prisma.product.findMany({
      where: {
        userId: userId,
        // 既然是看别人的橱窗，通常只看“在售”的，或者已售出的排后面
        // 如果你想全部显示，就不加 status 过滤，只在排序处理
      },
      orderBy: [
        { status: 'asc' },     // 在售在前，已售在后
        { createdAt: 'desc' }  // 新发布的在前
      ],
    });

    const processedProducts = products.map(p => {
      let firstImage = '';
      try {
        const imagesArr = JSON.parse(p.images);
        if (Array.isArray(imagesArr) && imagesArr.length > 0) {
          firstImage = imagesArr[0];
        } else {
          firstImage = p.images;
        }
      } catch {
        firstImage = p.images;
      }

      const publicProduct = withoutContact(p);
      return {
        ...publicProduct,
        contact: '******',
        isUnlocked: false,
        images: toAbsoluteUrl(firstImage)
      };
    });

    return NextResponse.json(processedProducts);

  } catch (error) {
    console.error('获取用户商品失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

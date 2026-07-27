// src/app/api/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { processImages, toAbsoluteUrl } from '@/lib/urlUtils';
import { withoutContact } from '@/lib/publicData';

// GET: 获取我的收藏列表
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const way = searchParams.get('way');
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');

    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0'));
    const take = Math.min(100, Math.max(1, parseInt(searchParams.get('take') || '10')));

    // 1. 构建查询条件
    const productFilters: Prisma.ProductWhereInput[] = [];

    if (way && way !== '全部') {
      productFilters.push({ way: way });
    }

    if (category && category !== '全部') {
      productFilters.push({ category: category });
    }

    if (keyword) {
      productFilters.push({
        OR: [
          { name: { contains: keyword } },
          { description: { contains: keyword } }
        ]
      });
    }

    const whereClause: Prisma.FavoriteWhereInput = {
      userId: userId,
      product: productFilters.length > 0 ? { AND: productFilters } : undefined
    };

    // 2. 数据库查询
    const [favorites, total] = await prisma.$transaction([
      prisma.favorite.findMany({
        where: whereClause,
        include: {
          product: {
            include: {
              user: { select: { username: true, avatar: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.favorite.count({ where: whereClause })
    ]);

    // 3. 处理图片路径，加上域名
    const processedFavorites = favorites.map(item => {
      const product = withoutContact(item.product);
      return {
      ...item,
      product: {
        ...product,
        contact: '******',
        isUnlocked: false,
        // 自动处理商品图片（无论是单张还是 JSON 数组）
        images: processImages(product.images),
        user: {
          ...product.user,
          // 处理卖家头像
          avatar: toAbsoluteUrl(product.user.avatar)
        }
      }
    }});

    // 4. 返回处理后的数据
    return NextResponse.json({
      data: processedFavorites,
      meta: {
        total,
        skip,
        take,
        hasMore: skip + favorites.length < total
      }
    });

  } catch (error) {
    console.error('获取收藏失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '请选择要取消的商品' }, { status: 400 });
    }

    const result = await prisma.favorite.deleteMany({
      where: {
        id: { in: ids },
        userId: userId
      }
    });

    return NextResponse.json({
      success: true,
      message: `成功取消 ${result.count} 个收藏`
    });
  } catch (error) {
    console.error('批量删除收藏失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

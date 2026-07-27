//src\app\api\favorites\toggle\route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';

// POST /api/favorites/toggle
export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const body = await req.json();
    const { productId } = body;

    const pId = Number(productId);
    if (isNaN(pId)) return NextResponse.json({ error: '无效的商品ID' }, { status: 400 });

    // 1. 查询商品是否存在以及发布者ID
    const product = await prisma.product.findUnique({
      where: { id: pId },
      select: { userId: true }
    });

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    // 2. 禁止收藏自己的商品
    if (product.userId === userId) {
      return NextResponse.json({ error: '不能收藏自己的商品' }, { status: 403 });
    }

    // 3. 检查是否已收藏
    // 使用 userId_productId 复合唯一索引查询，提高效率
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: userId,
          productId: pId
        }
      }
    });

    if (existing) {
      // 已存在 -> 取消收藏
      await prisma.favorite.delete({
        where: { id: existing.id }
      });
      return NextResponse.json({ isFavorited: false, message: '已取消收藏' });
    } else {
      // 不存在 -> 添加收藏
      await prisma.favorite.create({
        data: {
          userId: userId,
          productId: pId
        }
      });
      return NextResponse.json({ isFavorited: true, message: '收藏成功' });
    }

  } catch (error) {
    console.error('收藏操作失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
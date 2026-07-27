import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';

const EVALUATE_REWARD = 15; // 评价奖励积分

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const body = await req.json();
    const { productId, rating, content } = body;

    if (!productId || !rating) return NextResponse.json({ error: '参数缺失' }, { status: 400 });

    // 1. 查找交易记录
    const record = await prisma.unlockedContact.findUnique({
      where: { userId_productId: { userId, productId: Number(productId) } }
    });

    if (!record) return NextResponse.json({ error: '未找到交易记录' }, { status: 404 });
    if (record.status === 1) return NextResponse.json({ error: '已评价过' }, { status: 400 });

    const sellerId = record.sellerId;

    // --- 开启事务 ---
    await prisma.$transaction(async (tx) => {
      // A. 更新评价状态
      await tx.unlockedContact.update({
        where: { id: record.id },
        data: {
          status: 1,
          rating: Number(rating),
          content: content || '默认好评',
          commentAt: new Date()
        }
      });

      // B. 更新卖家信用分
      // 简单算法：好评(4-5) +2分，中评(3) +0分，差评(1-2) -5分
      let scoreChange = 0;
      if (rating >= 4) scoreChange = 2;
      else if (rating === 3) scoreChange = 0;
      else scoreChange = -5;

      await tx.user.update({
        where: { id: sellerId },
        data: {
          creditScore: { increment: scoreChange }, // 更新行为分
          ratingSum: { increment: Number(rating) }, // 更新总星数
          ratingCount: { increment: 1 }             // 更新评价数
        }
      });

      // C. 给买家发积分奖励
      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: EVALUATE_REWARD } }
      });

      await tx.pointLog.create({
        data: {
          userId,
          type: 5, // 5: 评价奖励
          amount: EVALUATE_REWARD,
          description: '评价商品奖励'
        }
      });
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('评价失败:', error);
    return NextResponse.json({ error: '评价失败' }, { status: 500 });
  }
}
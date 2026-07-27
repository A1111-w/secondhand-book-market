import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';

const UNLOCK_COST = 0; // 解锁消耗积分

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const body = await req.json();
    const { productId } = body;

    // 1. 检查商品是否存在
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: '商品不存在' }, { status: 404 });

    // 2. 检查是否是自己的商品
    if (product.userId === userId) {
        return NextResponse.json({ success: true, contact: product.contact, msg: '这是您自己的商品' });
    }

    // 3. 检查是否已经解锁过 (防止重复扣费)
    const exist = await prisma.unlockedContact.findUnique({
        where: { userId_productId: { userId, productId } }
    });
    if (exist) {
        return NextResponse.json({ success: true, contact: product.contact, msg: '已解锁过' });
    }

    // 4. 检查余额 + 开启事务
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.points < UNLOCK_COST) {
        return NextResponse.json({ error: '积分不足，请去赚积分' }, { status: 402 }); // 402 Payment Required
    }

    // --- 事务开始 ---
    const result = await prisma.$transaction(async (tx) => {
        // A. 扣分
        await tx.user.update({
            where: { id: userId },
            data: { points: { decrement: UNLOCK_COST } }
        });

        // B. 记录积分流水 (3: 支出)
        await tx.pointLog.create({
            data: {
                userId,
                type: 3,
                amount: -UNLOCK_COST,
                description: `解锁商品 [${product.name.substring(0,10)}] 联系方式`
            }
        });

        // C. 记录解锁关系
        await tx.unlockedContact.create({
            data: {
                userId,
                productId,
                sellerId: product.userId
            }
        });

        return product.contact;
    });
    // --- 事务结束 ---

    return NextResponse.json({ success: true, contact: result });

  } catch (error) {
    console.error('解锁失败:', error);
    return NextResponse.json({ error: '解锁失败' }, { status: 500 });
  }
}
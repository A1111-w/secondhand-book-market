import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAddressIndex } from '@/lib/productUtils';
import { requireMaintenanceAdmin } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const authorization = await requireMaintenanceAdmin(req);
    if (!authorization.ok) return authorization.response;
    // 1. 查出所有商品
    const products = await prisma.product.findMany();
    let updatedCount = 0;

    // 2. 遍历并修复
    for (const p of products) {
      // 如果有位置字符串，但 positionIndex 是 null (或者是错的)，就重新计算
      if (p.position) {
        const newIndex = getAddressIndex(p.position);

        // 只要算出来的索引有效 (>=0)，就更新进去
        if (newIndex !== -1) {
          await prisma.product.update({
            where: { id: p.id },
            data: { positionIndex: newIndex }
          });
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `共扫描 ${products.length} 个商品，修复了 ${updatedCount} 个商品的坐标索引。`
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '修复失败' }, { status: 500 });
  }
}

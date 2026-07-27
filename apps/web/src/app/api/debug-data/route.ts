import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAddressIndex } from '@/lib/productUtils';
import { requireMaintenanceAdmin } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const authorization = await requireMaintenanceAdmin(req);
    if (!authorization.ok) return authorization.response;
    // 1. 获取您当前认为的地址
    const address = req.nextUrl.searchParams.get('address');
    const userIndex = address ? getAddressIndex(address) : -1;

    // 2. 查出那两个有问题的商品 (8元和10元的)
    const products = await prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, price: true, position: true, positionIndex: true }
    });

    // 3. 模拟查距离
    const debugInfo = await Promise.all(products.map(async (p) => {
      let distanceRecord = null;
      if (p.positionIndex !== null && userIndex !== -1) {
        distanceRecord = await prisma.distance.findUnique({
          where: {
            fromIndex_toIndex: {
              fromIndex: p.positionIndex,
              toIndex: userIndex
            }
          }
        });
      }
      return {
        商品名: p.name,
        价格: p.price,
        数据库里的位置: p.position,
        数据库里的索引: p.positionIndex,
        你的位置: address,
        你的索引: userIndex, // 关键：看看这里是不是 -1
        查到的距离: distanceRecord ? distanceRecord.value : '未找到记录'
      };
    }));

    return NextResponse.json(debugInfo);

  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}

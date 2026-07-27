import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { distanceMatrix } from '@/lib/productUtils';
import { requireMaintenanceAdmin } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const authorization = await requireMaintenanceAdmin(req);
    if (!authorization.ok) return authorization.response;
    console.log('开始导入距离数据...');

    // 1. 先清空旧数据 (防止重复)
    await prisma.distance.deleteMany({});
    console.log('旧数据已清空');

    // 2. 准备批量插入的数据
    const dataToInsert = [];

    for (let fromIdx = 0; fromIdx < distanceMatrix.length; fromIdx++) {
      const row = distanceMatrix[fromIdx];
      for (let toIdx = 0; toIdx < row.length; toIdx++) {
        const dist = row[toIdx];
        // 只有有效的距离才插入
        if (typeof dist === 'number') {
          dataToInsert.push({
            fromIndex: fromIdx,
            toIndex: toIdx,
            value: dist
          });
        }
      }
    }

    console.log(`准备插入 ${dataToInsert.length} 条距离数据...`);

    // 3. 批量插入 (createMany 比循环 create 快得多)
    await prisma.distance.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      message: `成功导入 ${dataToInsert.length} 条距离数据`
    });

  } catch (error) {
    console.error('导入失败:', error);
    return NextResponse.json({ error: '导入失败' }, { status: 500 });
  }
}

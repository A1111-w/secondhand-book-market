import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // 1. 计算3天前的时间点
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 2. 分组统计 (Group By)
    const results = await prisma.searchLog.groupBy({
      by: ['keyword'],
      where: {
        createdAt: { gte: threeDaysAgo } // 只查最近3天
      },
      _count: {
        keyword: true // 统计出现次数
      },
      orderBy: {
        _count: {
          keyword: 'desc' // 按次数倒序
        }
      },
      take: 10 // 只取前10名
    });

    // 3. 格式化输出 ['自行车', '考研', '手机']
    const hotKeywords = results.map(item => item.keyword);

    return NextResponse.json({ data: hotKeywords });
  } catch (error) {
    console.error('获取热搜词失败:', error);
    return NextResponse.json({ data: [] }); // 出错返回空数组，不崩页面
  }
}
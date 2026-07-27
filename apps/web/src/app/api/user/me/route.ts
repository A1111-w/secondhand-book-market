import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';
import { toAbsoluteUrl } from '@/lib/urlUtils';
import { withoutPassword } from '@/lib/publicData';

export async function GET(req: NextRequest) {
  try {
    // 1. 验证 Token
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 2. 查询最新用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 3. 剔除密码，处理头像 URL
    const userWithoutPassword = withoutPassword(user);

    const processedUser = {
      ...userWithoutPassword,
      avatar: toAbsoluteUrl(user.avatar),
    };

    // 4. 返回包含 points 的完整信息
    return NextResponse.json(processedUser);

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

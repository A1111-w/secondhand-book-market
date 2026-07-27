// src/app/api/messages/conversations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';
import { toAbsoluteUrl } from '@/lib/urlUtils';

export async function GET(req: NextRequest) {
  try {
    const currentUserId = getUserIdFromToken(req);
    if (!currentUserId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 1. 找出所有聊过天的人
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ fromUserId: currentUserId }, { toUserId: currentUserId }],
      },
      select: { fromUserId: true, toUserId: true },
    });

    const otherUserIds = new Set(
      messages.map(msg =>
        msg.fromUserId === currentUserId ? msg.toUserId : msg.fromUserId
      )
    );

    // 2. 并行查询：最后一条消息 + 未读数
    const conversationPromises = Array.from(otherUserIds).map(async (otherId) => {
      // A. 查最后一条消息
      const latestMsg = await prisma.message.findFirst({
        where: {
          OR: [
            { fromUserId: currentUserId, toUserId: otherId },
            { fromUserId: otherId, toUserId: currentUserId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          fromUser: { select: { id: true, username: true, avatar: true } },
          toUser: { select: { id: true, username: true, avatar: true } },
        },
      });

      // B. 查未读数量 (别人发给我的，且未读的)
      const unreadCount = await prisma.message.count({
        where: {
          fromUserId: otherId,     // 对方发的
          toUserId: currentUserId, // 发给我的
          isRead: false            // 未读
        }
      });

      return { latestMsg, unreadCount };
    });

    const results = await Promise.all(conversationPromises);

    // 3. 组装数据
    const conversations = results
      .filter((item): item is { latestMsg: NonNullable<typeof item.latestMsg>, unreadCount: number } => item.latestMsg !== null)
      .map(({ latestMsg, unreadCount }) => {
        const otherUser = latestMsg.fromUserId === currentUserId ? latestMsg.toUser : latestMsg.fromUser;

        return {
          otherUserId: otherUser.id,
          username: otherUser.username || '匿名用户',
          avatar: toAbsoluteUrl(otherUser.avatar) || toAbsoluteUrl('/uploads/avatar_3_1761580059654.jpg'),
          lastMessageTime: latestMsg.createdAt,
          unreadCount: unreadCount, // 返回未读数
        };
      })
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('获取会话列表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
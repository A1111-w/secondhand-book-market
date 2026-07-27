import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromToken } from '@/lib/auth';
import { toAbsoluteUrl } from '@/lib/urlUtils';


type Props = {
  params: Promise<{ otherUserId: string }>
};

/**
 * GET /api/messages/[otherUserId]
 * 获取与特定用户的聊天记录
 */
export async function GET(
  req: NextRequest,
  { params }: Props
) {
  try {

    const { otherUserId: idStr } = await params;

    // 1. 获取当前登录者
    const currentUserId = getUserIdFromToken(req);
    if (!currentUserId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 2. 获取聊天对象 (使用解析出来的 idStr)
    const otherUserId = parseInt(idStr, 10);
    if (isNaN(otherUserId)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    await prisma.message.updateMany({
      where: {
        fromUserId: otherUserId, // 对方发的
        toUserId: currentUserId, // 我收的
        isRead: false            // 未读的
      },
      data: {
        isRead: true             // 改为已读
      }
    });

    // 3. 查询两人之间的所有消息
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          // A 发给 B
          { fromUserId: currentUserId, toUserId: otherUserId },
          // B 发给 A
          { fromUserId: otherUserId, toUserId: currentUserId },
        ],
      },
      include: {
        // 包含发送者的头像信息
        fromUser: {
          select: {
            avatar: true,
          },
        },
      },
      // 必须按时间升序，保证聊天记录的顺序
      orderBy: {
        createdAt: 'asc',
      },
    });

    const processedMessages = messages.map(msg => {
      // 处理发送者的头像
      if (msg.fromUser && msg.fromUser.avatar) {
        msg.fromUser.avatar = toAbsoluteUrl(msg.fromUser.avatar);
      }

      // 如果是图片消息 (type === 1)
      if (msg.type === 1) {
        msg.content = toAbsoluteUrl(msg.content);
      }

      if (msg.type === 2) {
        try {
          const contentObj = JSON.parse(msg.content);

          if (contentObj.image) {
            let realImage = contentObj.image;

            // 检测是否是数组字符串（例如 '["url1", "url2"]'）
            // 如果是，尝试解析并取第一个
            if (typeof realImage === 'string' && realImage.startsWith('[')) {
              try {
                const parsedArr = JSON.parse(realImage);
                if (Array.isArray(parsedArr) && parsedArr.length > 0) {
                  realImage = parsedArr[0]; //  取出第一张！
                }
              } catch {
                // 解析失败就算了，按原样处理
              }
            }

            // 统一加上域名
            contentObj.image = toAbsoluteUrl(realImage);
          }

          // 重新转回字符串
          msg.content = JSON.stringify(contentObj);
        } catch {
          // 解析失败就不动它
        }
      }

      return msg;
    });

    return NextResponse.json({ messages: processedMessages });

  } catch (error) {
    console.error('获取聊天记录失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * POST /api/messages/[otherUserId]
 * 向特定用户发送一条消息
 */
export async function POST(
  req: NextRequest,
  { params }: Props
) {
  try {

    const { otherUserId: idStr } = await params;

    // 1. 获取当前登录者
    const currentUserId = getUserIdFromToken(req);
    if (!currentUserId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 2. 获取聊天对象
    const otherUserId = parseInt(idStr, 10);
    if (isNaN(otherUserId)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    // 3. 获取消息内容
    const body = await req.json();
    const { content, type = 0 } = body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }

    // 4. 创建新消息
    const newMessage = await prisma.message.create({
      data: {
        content: content.trim(),
        type: type,
        fromUserId: currentUserId,
        toUserId: otherUserId,
      },
    });

    return NextResponse.json(newMessage, { status: 201 });

  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

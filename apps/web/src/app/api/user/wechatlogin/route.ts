import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import { toAbsoluteUrl } from '@/lib/urlUtils';

const APPID = process.env.WX_APPID!;
const APPSECRET = process.env.WX_APPSECRET!;
const DEFAULT_AVATAR = "/uploads/avatar_3_1761580059654.jpg";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "code 必填" }, { status: 400 });
    }

    // 微信接口换取 openid
    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${APPSECRET}&js_code=${code}&grant_type=authorization_code`
    );
    const wxData = await wxRes.json();
    if (!wxData.openid) {
      console.error("微信接口返回异常", wxData);
      return NextResponse.json({ error: "微信登录失败" }, { status: 500 });
    }
    const openid = wxData.openid;


// 查找用户
let user = await prisma.user.findUnique({ where: { wechatOpenId: openid } });

if (!user) {
  // 第一次登录，创建用户。
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  user = await prisma.user.create({
    data: {
      wechatOpenId: openid,
      // 设置默认昵称，例如 "同学_xm29a"
      username: `同学_${randomSuffix}`,
      // 设置默认头像
      avatar: DEFAULT_AVATAR,
    },
  });
}



    // 生成 JWT
    const token = generateToken({ id: user.id, openid: user.wechatOpenId });

    // 返回 user，avatar 带时间戳防缓存
    const userResp = {
    id: user.id,
    username: user.username,
    // 注意：这里的 user.avatar 就是数据库里最新的值（可能是自定义头像URL）
    avatar: user.avatar ? `${toAbsoluteUrl(user.avatar)}?t=${Date.now()}` : toAbsoluteUrl(user.avatar),
    phone: user.phone,
    address: user.address,
    wechatBound: !!user.wechatOpenId,
    isStudent: user.isStudent,
    role: user.role,
    points: user.points,
 };

     return NextResponse.json({ user: userResp, token });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "微信登录失败" }, { status: 500 });
  }
}

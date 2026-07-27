// src/app/api/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contact, content, images } = body as {
      contact: string;
      content: string;
      images: string[]; // base64 data URI 数组
    };

    // --- 1. 参数校验 ---
    if (!contact || !content) {
      return NextResponse.json({ error: "联系方式和反馈内容不能为空" }, { status: 400 });
    }

    // --- 2. 配置 Nodemailer transporter ---
    // 我们使用QQ邮箱的SMTP服务
    const transporter = nodemailer.createTransport({
      host: "smtp.qq.com", // QQ邮箱的SMTP服务器
      port: 465, // SSL端口
      secure: true, // 使用SSL
      auth: {
        user: process.env.MAILER_USER, // QQ邮箱账号
        pass: process.env.MAILER_PASS, // 生成的16位授权码
      },
    });

    // --- 3. 准备邮件附件 (处理图片) ---
    const attachments = images.map((base64Data, index) => {
      return {
        filename: `feedback_image_${index + 1}.png`,
        content: base64Data.split("base64,")[1], // 移除 data URI 前缀
        encoding: "base64",
        cid: `image${index}`, // content ID
      };
    });

    // --- 4. 准备邮件内容 (HTML格式) ---
    let imageHtml = "";
    if (attachments.length > 0) {
      imageHtml = `
        <h2>用户上传的图片：</h2>
        ${attachments.map(att => `<img src="cid:${att.cid}" style="max-width: 90%; border-radius: 8px; margin-bottom: 10px;" />`).join("")}
      `;
    }

    const mailOptions = {
      from: `"小程序反馈助手" <${process.env.MAILER_USER}>`, // 发件人
      to: process.env.MAILER_TO, // 收件人
      subject: "【新反馈】您有一条来自小程序的用户反馈！", // 邮件标题
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #333;">新的用户反馈</h1>
          <hr>
          <p><strong>联系方式：</strong> ${contact}</p>
          <p><strong>反馈内容：</strong></p>
          <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
            ${content.replace(/\n/g, "<br>")}
          </div>
          ${imageHtml}
          <hr>
          <p style="font-size: 12px; color: #888;">该邮件由小程序后端自动发送。</p>
        </div>
      `,
      attachments: attachments,
    };

    // --- 5. 发送邮件 ---
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: "反馈已成功发送" });

  } catch (error) {
    console.error("发送反馈邮件失败:", error);
    return NextResponse.json({ error: "服务器内部错误，发送失败" }, { status: 500 });
  }
}
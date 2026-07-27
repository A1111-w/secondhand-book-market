// src/app/api/announcements/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
// 引入你封装好的工具
import { toAbsoluteUrl } from '@/lib/urlUtils';

const filePath = path.join(process.cwd(), 'src/app/api/announcements/data.json');

type AnnouncementRecord = Record<string, unknown> & {
  image?: string | null;
  createdAt?: string;
};

function isAnnouncementRecord(value: unknown): value is AnnouncementRecord {
  return value !== null && typeof value === 'object';
}

export async function GET() {
  try {
    let data: Array<AnnouncementRecord & { image: string | null; dateDisplay: string }> = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const rawData: unknown = JSON.parse(fileContent);

      data = (Array.isArray(rawData) ? rawData : []).filter(isAnnouncementRecord).map((item) => {
        const createdAt = typeof item.createdAt === 'string' ? item.createdAt : '';
        return {
          ...item,
          // 如果有配图，自动加上域名；没有则给 null
          image: item.image ? toAbsoluteUrl(item.image) : null,
          // 格式化时间，或者留给前端格式化也可以，这里演示后端处理
          dateDisplay: createdAt ? new Date(createdAt).toLocaleDateString() : ''
        };
      });

      // 按时间倒序
      data.sort((a, b) =>
        new Date(typeof b.createdAt === 'string' ? b.createdAt : 0).getTime()
          - new Date(typeof a.createdAt === 'string' ? a.createdAt : 0).getTime()
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('读取公告失败:', error);
    return NextResponse.json({ data: [] });
  }
}

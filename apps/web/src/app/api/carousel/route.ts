import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { toAbsoluteUrl } from '@/lib/urlUtils';

const filePath = path.join(process.cwd(), 'src/app/api/carousel/carousel.json'); // 存轮播图信息

type CarouselRecord = Record<string, unknown> & { url: string };

function isCarouselRecord(value: unknown): value is CarouselRecord {
  return value !== null && typeof value === 'object' && typeof (value as Record<string, unknown>).url === 'string';
}

export async function GET() {
  // 读取轮播图数据
  let data: Array<CarouselRecord & { url: string | null }> = [];
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const rawData: unknown = JSON.parse(fileContent);
      data = (Array.isArray(rawData) ? rawData : []).filter(isCarouselRecord).map((item) => ({
        ...item,
        url: toAbsoluteUrl(item.url)
      }));
    } catch {
      data = [];
    }
  }
  return NextResponse.json({ success: true, data });
}

// src/app/api/announcements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { toAbsoluteUrl } from '@/lib/urlUtils';

const filePath = path.join(process.cwd(), 'src/app/api/announcements/data.json');

type AnnouncementRecord = Record<string, unknown> & {
  id?: number;
  image?: string | null;
};

function isAnnouncementRecord(value: unknown): value is AnnouncementRecord {
  return value !== null && typeof value === 'object';
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = parseInt(params.id);

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsed: unknown = JSON.parse(fileContent);
      const list = Array.isArray(parsed) ? parsed.filter(isAnnouncementRecord) : [];
      const item = list.find((candidate) => candidate.id === id);

      if (item) {
        const processedItem = {
            ...item,
            image: item.image ? toAbsoluteUrl(item.image) : null
        };
        return NextResponse.json({ data: processedItem });
      }
    }

    return NextResponse.json({ error: '公告不存在' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

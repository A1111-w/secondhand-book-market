// src/app/api/isbn/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const APPKEY = process.env.JISU_APPKEY!; // .env 配置


interface BookInfo {
  status: string;
  msg: string;
  result?: {
    isbn: string;
    title: string;
    subtitle: string;
    origin_title: string;
    alt_title: string;
    author: string[];
    translator: string[];
    publisher: string;
    pubdate: string;
    binding: string;
    price: string;
    pages: string;
    summary: string;
    catalog: string;
    tags: string[];
    image: string;
  };
}

// GET /api/isbn?isbn=xxxx
export async function GET(req: NextRequest) {
  const isbn = req.nextUrl.searchParams.get("isbn");

  if (!isbn) {
    return NextResponse.json({ error: "缺少 isbn 参数" }, { status: 400 });
  }

  try {
    const apiUrl = `https://api.jisuapi.com/isbn/query?appkey=${APPKEY}&isbn=${isbn}`;
    const response = await axios.get<BookInfo>(apiUrl);

    return NextResponse.json(response.data);
  } catch (err) {
    console.error("请求 ISBN API 出错:", err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

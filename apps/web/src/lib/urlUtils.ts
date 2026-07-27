// src/lib/urlUtils.ts

const HOST = process.env.HOST_BASE_URL || 'http://localhost:3000';

export function toAbsoluteUrl(path: string | null): string {
  if (!path) return '';

  // 1. 如果是 http 开头，说明是外部链接（如微信头像），直接返回
  if (path.startsWith('http') || path.startsWith('https')) return path;

  // 2. 如果是相对路径，拼上 HOST
  // 确保 path 以 / 开头
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${HOST}${cleanPath}`;
}

export function processImages(imagesJson: string): string {
  try {
    // 尝试解析 JSON 数组
    const images = JSON.parse(imagesJson);
    if (Array.isArray(images)) {
      // 数组情况：["/img/1.jpg", "/img/2.jpg"] -> ["http://IP/img/1.jpg", ...]
      const newImages = images.map(img => toAbsoluteUrl(img));
      // 注意：前端通常希望拿到数组，或者你可以转回字符串，这里建议直接返回处理后的 JSON 字符串
      // 但为了兼容你现有的前端逻辑（如果前端直接 JSON.parse 使用），我们保持结构
      return JSON.stringify(newImages);
    }
    return toAbsoluteUrl(imagesJson);
  } catch {
    // 不是 JSON，说明是单张图片路径
    return toAbsoluteUrl(imagesJson);
  }
}

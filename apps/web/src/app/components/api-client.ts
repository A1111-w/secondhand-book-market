export type SessionUser = {
  id: number;
  username?: string | null;
  phone?: string | null;
  avatar?: string | null;
  address?: string | null;
  contact?: string | null;
  role?: "user" | "admin" | string;
  isStudent?: number;
  points?: number;
};

export type ProductUser = {
  id: number;
  username?: string | null;
  avatar?: string | null;
  address?: string | null;
  creditScore?: number;
  avgRating?: number;
};

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  images: unknown;
  category: string;
  contact?: string | null;
  isbn?: string | null;
  price: number;
  position?: string | null;
  way?: string | null;
  range?: string[] | string | null;
  createdAt?: string;
  userId: number;
  status?: number;
  distance?: number | null;
  viewCount?: number;
  user?: ProductUser;
  isUnlocked?: boolean;
  isFavorited?: boolean;
};

export type PendingStudent = {
  id: number;
  realName?: string | null;
  studentId?: string | null;
  college?: string | null;
  major?: string | null;
  className?: string | null;
  grade?: string | null;
  gender?: string | null;
  studentCardImg?: string | null;
  createdAt: string;
};

const TOKEN_KEY = "huali-market-token";
const USER_KEY = "huali-market-user";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionUser;
  } catch {
    window.localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function storeSession(token: string, user: SessionUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, { ...init, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const rawMessage = data && typeof data.error === "string" ? data.error : "";
    const message = /[\u4e00-\u9fff]/.test(rawMessage)
      ? rawMessage
      : response.status === 401
        ? "登录状态已失效，请重新登录"
        : response.status === 403
          ? "当前账号没有此操作权限"
          : "请求失败，请稍后重试";
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export function normalizeImages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return normalizeImages(parsed);
  } catch {
    return [value];
  }
}

export function formatDate(value?: string) {
  if (!value) return "时间未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

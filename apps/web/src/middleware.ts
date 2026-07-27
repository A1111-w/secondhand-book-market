import { NextRequest, NextResponse } from "next/server";

function withSecurityHeaders(response: NextResponse, isApi: boolean) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  if (isApi) response.headers.set("Cache-Control", "no-store");
  return response;
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/uploads/verify/")) {
    return withSecurityHeaders(new NextResponse(null, { status: 404 }), false);
  }
  return withSecurityHeaders(NextResponse.next(), request.nextUrl.pathname.startsWith("/api/"));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

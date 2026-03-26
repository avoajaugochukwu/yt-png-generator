import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return NextResponse.next();
  }
  return withAuth(request);
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};

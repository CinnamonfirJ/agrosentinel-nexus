import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Presence check only. The backend and the server-rendered dashboard validate sessions.
export function proxy(request: NextRequest) {
  const session = request.cookies.get("agro_session")?.value;
  const { pathname } = request.nextUrl;
  if (
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/field") ||
      pathname.startsWith("/install")) &&
    !session
  ) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/field/:path*", "/install"],
};

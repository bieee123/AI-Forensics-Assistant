import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isAuthed = request.cookies.get("dfa-authed")?.value === "true";
  const path = request.nextUrl.pathname;
  const publicPaths = ["/login", "/forgot-password"];
  const isPublic = publicPaths.some(p => path.startsWith(p));

  if (!isAuthed && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAuthed && path === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

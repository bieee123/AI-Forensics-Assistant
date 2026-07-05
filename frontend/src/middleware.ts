import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isAuthed = request.cookies.get("dfa-authed")?.value === "true";
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!isAuthed && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAuthed && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

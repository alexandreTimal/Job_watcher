import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/feed", "/onboarding", "/offers", "/settings"];
const authPages = ["/login", "/register"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Check for session token (JWT strategy — cookie name from NextAuth)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;

  const isAuthenticated = !!sessionToken;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthPage = authPages.includes(pathname);

  // Redirect unauthenticated users to login
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  return NextResponse.next();
}

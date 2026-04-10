import { auth } from "@jobfindeer/auth";
import { NextResponse } from "next/server";

const protectedRoutes = ["/feed", "/onboarding", "/offers", "/settings"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !req.auth?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages
  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage && req.auth?.user) {
    return NextResponse.redirect(new URL("/feed", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons/).*)",
  ],
};

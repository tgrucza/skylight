import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/signin", "/api/auth", "/manifest.json", "/icons", "/sw.js", "/style-guide"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!req.auth && !isPublic) {
    const signInUrl = new URL("/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (req.auth && pathname === "/signin") {
    return NextResponse.redirect(new URL("/hub", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};

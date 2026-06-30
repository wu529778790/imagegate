import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/api/auth",
    "/api/auth/session",
    "/api/images", // Allow image API routes
    "/api/settings", // Allow settings API (for configuration)
    "/api/keys", // Allow API keys management
    "/api/records", // Allow records API
    "/api/stats", // Allow stats API
    "/api/generate", // Allow generate API (handles auth internally)
  ];

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // If it's a public route or the login page, allow access
  if (isPublicRoute || pathname === "/login") {
    return NextResponse.next();
  }

  // For API routes (other than public ones), return 401 if no session
  if (pathname.startsWith("/api/")) {
    const sessionCookie = request.cookies.get("authjs.session-token") ||
                          request.cookies.get("__Secure-authjs.session-token") ||
                          request.cookies.get("next-auth.session-token") ||
                          request.cookies.get("__Secure-next-auth.session-token");
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  // For page routes, allow access (pages will handle auth checks via AuthModal)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx|xlsx|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

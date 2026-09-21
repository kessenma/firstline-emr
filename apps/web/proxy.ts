// proxy.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

/**
 * Proxy for optimistic authentication checks
 *
 * Next.js recommends using proxy ONLY for:
 * 1. Optimistic checks (cookie-based, fast)
 * 2. Redirecting users based on auth state
 * 3. Protecting static routes
 *
 * For secure checks, use the Data Access Layer (DAL) in your API routes,
 * Server Components, and Server Actions.
 */
export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const isDev = process.env.NODE_ENV !== "production";

  // 1. Define public routes that don't require authentication
  const publicRoutes = [
    "/api/auth",
    "/api/mobile-auth",
    "/api/test-mobile-auth",
    "/auth",
    "/rx-order",
    "/create-med-evac-patient",
    "/med-evac-patient-table",
    "/med-evac-home",
    "/med-evac-audit-log",
    "/api/med-evac-patient",
    "/api/med-evac-audit-logs",
    "/about",
    "/new-patient",
    "/call",
    "/new-patient/telegram",
    "/telegram-patient",
    "/api/patient/validate-telegram-access",
    "/api/patient/telegram-intake",
    "/api/telegram-intake-form",
    "/api/patient/new/telegram",
    // Patient-facing video call join. Gated on a signed, expiring invite token
    // rather than a session; the webhook is authenticated by LiveKit's request
    // signature. Both verify their own caller — see app/api/video-call/.
    "/api/video-call/join",
    "/api/video-call/webhook",
    // Also patient-facing, also session-less. `photo-consent` is gated on the
    // same invite token as `join`; `capture` is gated on a 90-second token that
    // only an authenticated clinician can mint. Neither trusts a caller-supplied
    // patient id — see app/api/video-call/.
    "/api/video-call/photo-consent",
    "/api/video-call/capture",
    // Lists and deletes the captures from the caller's own call. Covers
    // /media/delete by prefix.
    "/api/video-call/media",
    "/admin-signup",
    "/api/admin-signup",
    "/api/admin/validate-verification-access",
    "/api/admin/verify-user-code",
    "/api/upload-license",
  ];

  // Check if the current path matches any of the public routes
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Also allow static files
  const isStaticFile = pathname.match(/\.(.*)$/);

  // Allow all public routes and static files to pass through
  if (isPublicRoute || isStaticFile) {
    return NextResponse.next();
  }

  // 2. Handle special telegram API routes with MEDFLOW_KEY
  const isTelegramApiRoute = pathname.startsWith("/api/telegram-thread");
  if (isTelegramApiRoute) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const providedKey = authHeader.substring(7);
      if (providedKey === process.env.MEDFLOW_KEY) {
        return NextResponse.next();
      }
    }
    // For telegram routes, let them through to the API handler
    // The API handler will do the secure check
    return NextResponse.next();
  }

  // 3. Redirect reset-password requests to login page with code
  if (pathname === "/reset-password" && searchParams.has("code")) {
    return NextResponse.redirect(
      new URL(`/auth/login?code=${searchParams.get("code")}`, req.url),
    );
  }

  // 4. Perform optimistic check using cookie-based session
  // NOTE: This ONLY checks for NextAuth cookies (web clients)
  // Mobile clients will pass through to API handlers where secure checks happen
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // 5. For API routes, let them through to the handler
  // The API route handler will do the secure authentication check using the DAL
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 6. For protected admin routes, check if user is admin
  if (pathname.startsWith("/adminDashboard") || pathname.startsWith("/admin")) {
    if (!token || !token.isAdmin) {
      if (isDev) console.log("🔒 [Proxy] ❌ Not admin, redirecting to home");
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 7. For all other protected pages, redirect to login if no session
  if (!token) {
    if (isDev) console.log("🔒 [Proxy] ❌ No session, redirecting to login:", pathname);
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}

// Routes Proxy should run on
// Exclude: _next/static, _next/image, favicon, other static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)",
  ],
};

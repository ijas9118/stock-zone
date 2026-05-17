import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function updateSession(request: NextRequest) {
  const cookies = request.cookies.getAll();
  const hasAuthCookie = cookies.some(
    (cookie) =>
      cookie.name.includes("auth-token") &&
      (cookie.name.startsWith("sb-") || cookie.name.startsWith("supabase-auth"))
  );

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
  let supabaseResponse = NextResponse.next({ request });

  // 1. Fast Path for Unauthenticated Users
  if (!hasAuthCookie) {
    if (isAuthRoute) return supabaseResponse;
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getClaims() for fast local verification
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // 2. Auth Page Protection (Logged-in users visiting /auth/login)
  if (claims && !error) {
    const role = claims.user_role;
    const dashboardPath =
      role === "admin" ? "/admin" : role === "manager" ? "/manager" : "/";

    if (
      isAuthRoute &&
      request.nextUrl.pathname !== "/auth/pending" &&
      request.nextUrl.pathname !== "/auth/rejected" &&
      request.nextUrl.pathname !== "/auth/reset-password"
    ) {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }

    const status = claims.user_status;
    const path = request.nextUrl.pathname;

    // 3. Status Protection
    if (status === "pending" && path !== "/auth/pending") {
      return NextResponse.redirect(new URL("/auth/pending", request.url));
    }
    if (status === "rejected" && path !== "/auth/rejected") {
      return NextResponse.redirect(new URL("/auth/rejected", request.url));
    }
    if (status === "inactive") {
      return NextResponse.redirect(
        new URL(
          "/auth/login?error=Your account is inactive. Please contact administrator.",
          request.url
        )
      );
    }

    // 4. Role Protection
    if (path.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    if (path.startsWith("/manager") && role !== "manager") {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }

    // User paths: /, /inventory/*, /profile/* — accessible only to users
    const userPaths = ["/inventory", "/profile"];
    if (
      (path === "/" || userPaths.some((p) => path.startsWith(p))) &&
      role !== "user"
    ) {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  } else if (!isAuthRoute) {
    // Session cookie exists but claims are invalid/expired - force login
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return supabaseResponse;
}

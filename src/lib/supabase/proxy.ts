import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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

  // IMPORTANT: use getClaims() not getSession() in server middleware
  await supabase.auth.getClaims();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const claims = await supabase.auth.getClaims();
    const status = claims?.data?.claims?.user_status;
    const role = claims?.data?.claims?.user_role;

    const isAppRoute = !request.nextUrl.pathname.startsWith("/auth");

    // 1. Status Protection
    if (isAppRoute && status === "pending") {
      return NextResponse.redirect(new URL("/auth/pending", request.url));
    }
    if (isAppRoute && status === "rejected") {
      return NextResponse.redirect(new URL("/auth/rejected", request.url));
    }

    // 2. Role Protection
    if (isAppRoute) {
      const path = request.nextUrl.pathname;
      const dashboardPath =
        role === "admin" ? "/admin" : role === "manager" ? "/manager" : "/user";

      // Prevent users from accessing other roles' dashboards
      if (path.startsWith("/admin") && role !== "admin") {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
      if (path.startsWith("/manager") && role !== "manager") {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
      if (path.startsWith("/user") && role !== "user") {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }

      // 3. Shared Route Protection
      const isManagerOrAdmin = role === "admin" || role === "manager";
      const restrictedRoutes = ["/warehouses", "/products", "/shops"];

      if (
        restrictedRoutes.some((route) => path.startsWith(route)) &&
        !isManagerOrAdmin
      ) {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
    }
  }

  return supabaseResponse;
}

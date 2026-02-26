import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/manager/:path*",
    "/user/:path*",
    "/warehouses/:path*",
    "/products/:path*",
    "/shops/:path*",
    "/auth/:path*",
  ],
};

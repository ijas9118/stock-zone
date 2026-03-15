import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const claims = await supabase.auth.getClaims();
      const role = claims?.data?.claims?.user_role || "user";
      const status = claims?.data?.claims?.user_status || "pending";

      if (status === "pending") {
        return NextResponse.redirect(`${origin}/auth/pending`);
      }
      if (status === "rejected") {
        return NextResponse.redirect(`${origin}/auth/rejected`);
      }
      if (status === "inactive") {
        return NextResponse.redirect(
          `${origin}/auth/login?error=Your account is inactive. Please contact administrator.`
        );
      }

      const redirectPath =
        role === "admin" ? "/admin" : role === "manager" ? "/manager" : "/";

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${origin}/auth/login?error=Could not authenticate user`
  );
}

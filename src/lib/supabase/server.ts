import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookie setting handled by Proxy
          }
        },
      },
    }
  );
}

type Claims = Record<string, unknown>;

function getStringClaim(claims: Claims, key: string) {
  const value = claims[key];
  return typeof value === "string" ? value : null;
}

// Cached helper to avoid redundant auth calls during a single request
export const getAuthContext = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? {}) as Claims;
  const metadata = (claims.user_metadata ?? {}) as Claims;

  return {
    isAuthenticated: !error && Boolean(getStringClaim(claims, "sub")),
    userId: getStringClaim(claims, "sub"),
    email: getStringClaim(claims, "email"),
    fullName:
      getStringClaim(claims, "full_name") ||
      getStringClaim(metadata, "full_name") ||
      getStringClaim(metadata, "name"),
    avatarUrl:
      getStringClaim(claims, "avatar_url") ||
      getStringClaim(metadata, "avatar_url") ||
      getStringClaim(metadata, "picture"),
    role: getStringClaim(claims, "user_role") ?? "user",
    status: getStringClaim(claims, "user_status") ?? "pending",
  };
});

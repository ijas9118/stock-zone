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

// Cached helpers to avoid redundant network calls during a single request
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});

export const getAuthClaims = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getClaims();
});

import { redirect } from "next/navigation";

import { getAuthClaims, getAuthUser } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const [
    {
      data: { user },
    },
    { data: claimsResponse },
  ] = await Promise.all([getAuthUser(), getAuthClaims()]);

  if (!user) {
    redirect("/auth/login");
  }

  const role = claimsResponse?.claims?.user_role;

  if (role === "admin") {
    redirect("/admin");
  } else if (role === "manager") {
    redirect("/manager");
  } else {
    redirect("/user");
  }
}

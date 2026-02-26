import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const auth = await getAuthContext();

  if (!auth.isAuthenticated) {
    redirect("/auth/login");
  }

  const role = auth.role;

  if (role === "admin") {
    redirect("/admin");
  } else if (role === "manager") {
    redirect("/manager");
  } else {
    redirect("/user");
  }
}

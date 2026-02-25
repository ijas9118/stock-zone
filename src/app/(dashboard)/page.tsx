import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const claims = await supabase.auth.getClaims();
  const role = claims?.data?.claims?.user_role;

  if (role === "admin") {
    redirect("/admin");
  } else if (role === "manager") {
    redirect("/manager");
  } else {
    redirect("/user");
  }
}

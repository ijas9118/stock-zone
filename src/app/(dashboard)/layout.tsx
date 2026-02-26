import { redirect } from "next/navigation";

import { getAuthClaims, getAuthUser } from "@/lib/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use cached helpers to avoid redundant network waterfalls
  const [
    {
      data: { user },
    },
    { data: claimsResponse },
  ] = await Promise.all([getAuthUser(), getAuthClaims()]);

  if (!user) {
    redirect("/auth/login");
  }

  const role = claimsResponse?.claims?.user_role || "user";

  return (
    <SidebarProvider>
      <AppSidebar role={role} user={user} />
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          <DashboardNavbar role={role} />
          <main className="flex-1 overflow-y-auto">
            <div className="h-full w-full p-4 md:p-6">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

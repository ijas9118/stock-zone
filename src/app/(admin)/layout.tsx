import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminThemeScope } from "@/components/dashboard/admin-theme-scope";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();

  if (!auth.isAuthenticated) {
    redirect("/auth/login");
  }

  const role = auth.role;

  return (
    <SidebarProvider>
      <AdminThemeScope />
      <AppSidebar
        role={role}
        user={{
          email: auth.email,
          fullName: auth.fullName,
          avatarUrl: auth.avatarUrl,
        }}
      />
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

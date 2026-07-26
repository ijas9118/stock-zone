import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/supabase/server";
import { AdminThemeScope } from "@/components/dashboard/admin-theme-scope";
import { BottomTabBar } from "@/components/user/layout/bottom-tab-bar";
import { UserNavbar } from "@/components/user/layout/user-navbar";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();

  if (!auth.isAuthenticated) {
    redirect("/auth/login");
  }

  if (auth.role !== "user") {
    const redirectPath = auth.role === "admin" ? "/admin" : "/manager";
    redirect(redirectPath);
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AdminThemeScope />
      <UserNavbar
        user={{
          email: auth.email,
          fullName: auth.fullName,
          avatarUrl: auth.avatarUrl,
        }}
      />
      <main className="mx-auto w-full max-w-screen-lg flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}

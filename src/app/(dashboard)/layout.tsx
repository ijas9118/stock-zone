import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const claims = await supabase.auth.getClaims();
  const role = claims?.data?.claims?.user_role || "user";

  const navItems = [
    {
      title: "Dashboard",
      href: `/${role === "user" ? "user" : role === "manager" ? "manager" : "admin"}`,
      icon: Icons.dashboard,
    },
  ];

  if (role === "admin") {
    navItems.push(
      { title: "Users", href: "/admin/users", icon: Icons.users },
      { title: "Shops", href: "/admin/shops", icon: Icons.shops }
    );
  }

  if (role === "admin" || role === "manager") {
    navItems.push(
      { title: "Warehouses", href: "/warehouses", icon: Icons.warehouses },
      { title: "Products", href: "/products", icon: Icons.products }
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNavbar role={role} />
      <div className="container mx-auto flex-1 items-start py-6 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="fixed top-24 z-30 -ml-2 hidden h-[calc(100vh-8rem)] w-full shrink-0 md:sticky md:block">
          <div className="space-y-4">
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                Management
              </h2>
              <div className="space-y-1">
                {navItems.map((item, index) => (
                  <Link key={index} href={item.href}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start font-normal"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>
        <main className="flex w-full flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
